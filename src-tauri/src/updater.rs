//! CodePlus-style desktop updates, using the public release API as the trust root.
//! No renderer-supplied URL, filename, executable, version or digest is accepted.
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{fs, io::{Read, Write}, path::{Path, PathBuf}, sync::Mutex, time::Duration};
use tauri::{ipc::Channel, Manager};

const API: &str = "https://api.github.com/repos/naylinhtunit/GlobalPay-Releases/releases/latest";
const PREFIX: &str = "https://github.com/naylinhtunit/GlobalPay-Releases/releases/download/";
const MAX_SIZE: u64 = 500_000_000;

#[derive(Clone, Deserialize)]
struct Asset { name: String, browser_download_url: String, size: u64, digest: Option<String> }
#[derive(Deserialize)]
struct Release { tag_name: String, draft: bool, prerelease: bool, assets: Vec<Asset> }
#[derive(Serialize)]
pub struct UpdateInfo { available: bool, version: String, platform: &'static str }
#[derive(Clone, Serialize)]
pub struct Progress { percent: u64 }
struct Download { directory: tempfile::TempDir, file: PathBuf }
#[derive(Default)]
pub struct Updater(Mutex<UpdateState>);
#[derive(Default)]
struct UpdateState { asset: Option<Asset>, version: String, download: Option<Download> }

fn parts(value: &str) -> Option<[u64; 3]> {
    let values: Vec<_> = value.strip_prefix('v').unwrap_or(value).split('.').collect();
    if values.len() != 3 || values.iter().any(|v| v.is_empty() || !v.bytes().all(|b| b.is_ascii_digit())) { return None; }
    Some([values[0].parse().ok()?, values[1].parse().ok()?, values[2].parse().ok()?])
}
fn newer(next: &str, current: &str) -> bool {
    matches!((parts(next), parts(current)), (Some(a), Some(b)) if a > b)
}
fn asset_name(platform: &str, arch: &str) -> Option<&'static str> {
    match (platform, arch) {
        ("macos", "aarch64") => Some("GlobalPay-macos-arm64.zip"),
        ("macos", "x86_64") => Some("GlobalPay-macos-x64.zip"),
        ("windows", "x86_64") => Some("GlobalPay.exe"),
        _ => None,
    }
}
fn trusted_host(url: &reqwest::Url) -> bool {
    url.scheme() == "https" && url.username().is_empty() && url.password().is_none()
        && url.port_or_known_default() == Some(443)
        && matches!(url.host_str(), Some("github.com" | "release-assets.githubusercontent.com" | "objects.githubusercontent.com"))
}
fn valid_asset(asset: &Asset, tag: &str, name: &str) -> bool {
    parts(tag).is_some() && asset.name == name && asset.size > 0 && asset.size <= MAX_SIZE
        && asset.browser_download_url == format!("{PREFIX}{tag}/{name}")
        && asset.digest.as_ref().is_some_and(|v| v.len() == 71 && v.starts_with("sha256:") && v[7..].bytes().all(|b| b.is_ascii_hexdigit()))
}
fn client(download: bool) -> Result<Client, String> {
    Client::builder().user_agent("GlobalPay-Desktop").connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(if download { 1800 } else { 20 }))
        .redirect(reqwest::redirect::Policy::custom(move |attempt| {
            if download && attempt.previous().len() < 8 && trusted_host(attempt.url()) { attempt.follow() }
            else { attempt.error("Untrusted update redirect") }
        })).build().map_err(|_| "update_check_failed".into())
}
fn verify(file: &Path, asset: &Asset) -> Result<(), String> {
    let mut input = fs::File::open(file).map_err(|_| "update_invalid")?;
    if !input.metadata().map_err(|_| "update_invalid")?.is_file() || input.metadata().map_err(|_| "update_invalid")?.len() != asset.size { return Err("update_invalid".into()); }
    let mut hash = Sha256::new(); let mut buffer = [0u8; 65536];
    loop {
        let count = input.read(&mut buffer).map_err(|_| "update_invalid")?;
        if count == 0 { break; } hash.update(&buffer[..count]);
    }
    if Some(format!("sha256:{:x}", hash.finalize())) != asset.digest.as_ref().map(|v| v.to_lowercase()) { return Err("update_invalid".into()); }
    Ok(())
}

fn validate_archive(file: &Path) -> Result<(), String> {
    use std::path::Component;
    let mut archive = zip::ZipArchive::new(fs::File::open(file).map_err(|_| "update_invalid")?).map_err(|_| "update_invalid")?;
    if archive.len() > 100_000 { return Err("update_invalid".into()); }
    let mut expanded = 0u64;
    for index in 0..archive.len() {
        let entry = archive.by_index(index).map_err(|_| "update_invalid")?;
        let path = entry.enclosed_name().ok_or("update_invalid")?;
        let root = path.components().next();
        if !matches!(root, Some(Component::Normal(name)) if name == "GlobalPay.app" || name == "__MACOSX")
            || path.components().any(|part| !matches!(part, Component::Normal(_))) || entry.name().contains('\\')
            || entry.unix_mode().is_some_and(|mode| mode & 0o170000 == 0o120000) { return Err("update_invalid".into()); }
        expanded = expanded.checked_add(entry.size()).ok_or("update_invalid")?;
        if expanded > 2_000_000_000 { return Err("update_invalid".into()); }
    }
    Ok(())
}

#[tauri::command]
pub async fn update_check(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let manager = app.state::<Updater>();
        let mut state = manager.0.try_lock().map_err(|_| "update_busy")?;
        let mut response = client(false)?.get(API).header("Accept", "application/vnd.github+json").send().and_then(|r| r.error_for_status()).map_err(|_| "update_check_failed")?;
        let mut bytes = Vec::new();
        (&mut response).take(1_000_001).read_to_end(&mut bytes).map_err(|_| "update_check_failed")?;
        if bytes.len() > 1_000_000 { return Err("release_invalid".into()); }
        let release: Release = serde_json::from_slice(&bytes).map_err(|_| "release_invalid")?;
        if release.draft || release.prerelease || parts(&release.tag_name).is_none() { return Err("release_invalid".into()); }
        let available = newer(&release.tag_name, &app.package_info().version.to_string());
        let version = release.tag_name.trim_start_matches('v').to_owned();
        let asset = if available {
            let name = asset_name(std::env::consts::OS, std::env::consts::ARCH).ok_or("update_platform_unavailable")?;
            Some(release.assets.into_iter().find(|a| valid_asset(a, &release.tag_name, name)).ok_or("update_platform_unavailable")?)
        } else { None };
        if state.version != version || state.asset.as_ref().map(|a| &a.digest) != asset.as_ref().map(|a| &a.digest) { state.download = None; }
        state.version = version.clone(); state.asset = asset;
        Ok(UpdateInfo { available, version, platform: std::env::consts::OS })
    }).await.map_err(|_| "update_check_failed".to_string())?
}

#[tauri::command]
pub async fn update_download(app: tauri::AppHandle, progress: Channel<Progress>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let manager = app.state::<Updater>();
        let mut state = manager.0.try_lock().map_err(|_| "update_busy")?;
        let asset = state.asset.clone().ok_or("release_invalid")?;
        if let Some(download) = &state.download {
            if verify(&download.file, &asset).is_ok() { let _ = progress.send(Progress { percent: 100 }); return Ok(()); }
        }
        state.download = None;
        let cache = app.path().app_cache_dir().map_err(|_| "update_download_failed")?.join("updates");
        fs::create_dir_all(&cache).map_err(|_| "update_download_failed")?;
        let directory = tempfile::Builder::new().prefix("download-").tempdir_in(cache).map_err(|_| "update_download_failed")?;
        let file = directory.path().join(if cfg!(windows) { "GlobalPay.exe" } else { "GlobalPay.zip" });
        let mut response = client(true)?.get(&asset.browser_download_url).send().and_then(|r| r.error_for_status()).map_err(|_| "update_download_failed")?;
        let mut output = fs::File::create(&file).map_err(|_| "update_download_failed")?;
        let mut received = 0; let mut last = 101; let mut buffer = [0u8; 65536];
        loop {
            let count = response.read(&mut buffer).map_err(|_| "update_download_failed")?;
            if count == 0 { break; }
            received += count as u64;
            if received > asset.size { return Err("update_invalid".into()); }
            output.write_all(&buffer[..count]).map_err(|_| "update_download_failed")?;
            let percent = received * 100 / asset.size;
            if percent != last { last = percent; let _ = progress.send(Progress { percent }); }
        }
        output.sync_all().map_err(|_| "update_download_failed")?; drop(output);
        verify(&file, &asset)?;
        state.download = Some(Download { directory, file });
        Ok(())
    }).await.map_err(|_| "update_download_failed".to_string())?
}

#[tauri::command]
pub async fn update_install(app: tauri::AppHandle) -> Result<(), String> {
    let installer_app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let manager = installer_app.state::<Updater>();
        let mut state = manager.0.try_lock().map_err(|_| "update_busy")?;
        let asset = state.asset.as_ref().ok_or("release_invalid")?;
        let download = state.download.as_ref().ok_or("update_invalid")?;
        verify(&download.file, asset)?;
        install(&installer_app, &download.file, &state.version)?;
        // Installer/helper outlives this process. Retain only this verified download.
        if let Some(download) = state.download.take() { let _ = download.directory.keep(); }
        Ok::<_, String>(())
    }).await.map_err(|_| "update_install_failed".to_string())??;
    app.exit(0);
    Ok(())
}

#[cfg(target_os = "macos")]
fn run(program: &str, args: &[&std::ffi::OsStr]) -> Result<String, String> {
    let result = std::process::Command::new(program).args(args).output().map_err(|_| "update_install_failed")?;
    if !result.status.success() { return Err("update_install_failed".into()); }
    Ok(String::from_utf8_lossy(&result.stdout).trim().into())
}

#[cfg(target_os = "macos")]
fn bundle() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().and_then(fs::canonicalize).map_err(|_| "update_install_failed")?;
    let target = exe.parent().and_then(Path::parent).and_then(Path::parent).ok_or("update_install_failed")?;
    if target.file_name().and_then(|s| s.to_str()) != Some("GlobalPay.app") || exe != target.join("Contents/MacOS/GlobalPay") { return Err("update_move_to_applications".into()); }
    if target.starts_with("/Volumes") || target.to_string_lossy().contains("/AppTranslocation/") { return Err("update_move_to_applications".into()); }
    Ok(target.into())
}

#[cfg(target_os = "macos")]
fn install(app: &tauri::AppHandle, archive: &Path, version: &str) -> Result<(), String> {
    use std::{ffi::OsStr, os::unix::{fs::PermissionsExt, process::CommandExt}, process::{Command, Stdio}};
    let target = bundle()?;
    validate_archive(archive)?;
    let parent = target.parent().ok_or("update_install_failed")?;
    // Same-volume staging permits atomic rename and tests write access before quitting.
    let stage = tempfile::Builder::new().prefix(".globalpay-update-").tempdir_in(parent).map_err(|_| "update_location_readonly")?;
    run("/usr/bin/ditto", &[OsStr::new("-x"), OsStr::new("-k"), archive.as_os_str(), stage.path().as_os_str()])?;
    let fresh = stage.path().join("GlobalPay.app");
    let meta = fs::symlink_metadata(&fresh).map_err(|_| "update_invalid")?;
    if !meta.is_dir() || meta.file_type().is_symlink() { return Err("update_invalid".into()); }
    let plist = fresh.join("Contents/Info.plist");
    let value = |key: &str| run("/usr/bin/plutil", &[OsStr::new("-extract"), OsStr::new(key), OsStr::new("raw"), OsStr::new("-o"), OsStr::new("-"), plist.as_os_str()]);
    if value("CFBundleIdentifier")? != "com.globalpay.desktop" || value("CFBundleShortVersionString")? != version { return Err("update_invalid".into()); }
    let binary = fresh.join("Contents/MacOS/GlobalPay");
    let arch = if cfg!(target_arch = "aarch64") { "arm64" } else { "x86_64" };
    if !run("/usr/bin/lipo", &[OsStr::new("-archs"), binary.as_os_str()])?.split_whitespace().any(|a| a == arch) { return Err("update_invalid".into()); }
    run("/usr/bin/codesign", &[OsStr::new("--verify"), OsStr::new("--deep"), OsStr::new("--strict"), fresh.as_os_str()])?;
    let helper = stage.path().join("install.sh");
    fs::write(&helper, include_str!("mac-install.sh")).map_err(|_| "update_install_failed")?;
    fs::set_permissions(&helper, fs::Permissions::from_mode(0o700)).map_err(|_| "update_install_failed")?;
    let backup = parent.join(format!(".GlobalPay-backup-{}.app", stage.path().file_name().unwrap().to_string_lossy().trim_start_matches(".globalpay-update-")));
    let data = app.path().app_data_dir().map_err(|_| "update_install_failed")?;
    fs::create_dir_all(&data).map_err(|_| "update_install_failed")?;
    let pending = Pending { target: target.clone(), stage: stage.path().into(), backup: backup.clone(), version: version.into() };
    fs::write(data.join("pending-update.json"), serde_json::to_vec(&pending).map_err(|_| "update_install_failed")?).map_err(|_| "update_install_failed")?;
    let mut command = Command::new("/bin/sh");
    command.arg(&helper).arg(&target).arg(&fresh).arg(&backup).arg(std::process::id().to_string()).arg(stage.path().join("status"))
        .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null()).process_group(0);
    command.spawn().map_err(|_| "update_install_failed")?;
    let _ = stage.keep();
    Ok(())
}

#[cfg(windows)]
fn install(_app: &tauri::AppHandle, file: &Path, _version: &str) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    let path: Vec<u16> = file.as_os_str().encode_wide().chain(Some(0)).collect();
    let verb: Vec<u16> = "open\0".encode_utf16().collect();
    // ShellExecute supports the OS elevation/installer confirmation instead of bypassing it.
    let result = unsafe { windows_sys::Win32::UI::Shell::ShellExecuteW(std::ptr::null_mut(), verb.as_ptr(), path.as_ptr(), std::ptr::null(), std::ptr::null(), 1) };
    if result as isize <= 32 { return Err("update_install_failed".into()); }
    Ok(())
}
#[cfg(not(any(target_os = "macos", windows)))]
fn install(_app: &tauri::AppHandle, _file: &Path, _version: &str) -> Result<(), String> { Err("update_platform_unavailable".into()) }

#[cfg(target_os = "macos")]
#[derive(Serialize, Deserialize)]
struct Pending { target: PathBuf, stage: PathBuf, backup: PathBuf, version: String }

/// Called only after the new bundle has been running successfully for 30 seconds.
pub fn finish_update(app: &tauri::AppHandle) {
    #[cfg(target_os = "macos")]
    let _ = (|| -> Result<(), Box<dyn std::error::Error>> {
        let data = app.path().app_data_dir()?;
        let pending_file = data.join("pending-update.json");
        let pending: Pending = serde_json::from_slice(&fs::read(&pending_file)?)?;
        let target = bundle().map_err(std::io::Error::other)?;
        let parent = target.parent().ok_or("No parent")?;
        let stage_name = pending.stage.file_name().and_then(|s| s.to_str()).unwrap_or("");
        let suffix = stage_name.strip_prefix(".globalpay-update-").ok_or("Invalid staging directory")?;
        if suffix.is_empty() || pending.version != app.package_info().version.to_string() || pending.target != target
            || pending.stage.parent() != Some(parent) || pending.backup != parent.join(format!(".GlobalPay-backup-{suffix}.app"))
            || fs::read_to_string(pending.stage.join("status"))?.trim() != "installed"
            || fs::symlink_metadata(&pending.stage)?.file_type().is_symlink()
            || fs::symlink_metadata(&pending.backup)?.file_type().is_symlink() { return Ok(()); }
        fs::remove_dir_all(&pending.backup)?;
        fs::remove_dir_all(&pending.stage)?;
        fs::remove_file(pending_file)?;
        Ok(())
    })();
    #[cfg(not(target_os = "macos"))]
    let _ = app;
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn rejects_downgrades_and_invalid_versions() {
        assert!(newer("v1.0.22", "1.0.21"));
        for candidate in ["v1.0.21", "1.0.20", "1.0.22-beta", "../1.0.23", "1.+1.1", "1.2"] { assert!(!newer(candidate, "1.0.21")); }
    }
    #[test] fn chooses_native_arch_never_guesses() {
        assert_eq!(asset_name("macos", "aarch64"), Some("GlobalPay-macos-arm64.zip"));
        assert_eq!(asset_name("macos", "x86_64"), Some("GlobalPay-macos-x64.zip"));
        assert_eq!(asset_name("windows", "x86_64"), Some("GlobalPay.exe"));
        assert_eq!(asset_name("windows", "aarch64"), None);
    }
    #[test] fn rejects_untrusted_assets_and_redirects() {
        let asset = Asset { name: "GlobalPay.exe".into(), size: 100, digest: Some(format!("sha256:{}", "a".repeat(64))), browser_download_url: format!("{PREFIX}v1.0.22/GlobalPay.exe") };
        assert!(valid_asset(&asset, "v1.0.22", "GlobalPay.exe"));
        let mut bad = asset.clone(); bad.browser_download_url.push_str("?evil=1"); assert!(!valid_asset(&bad, "v1.0.22", "GlobalPay.exe"));
        bad = asset.clone(); bad.digest = None; assert!(!valid_asset(&bad, "v1.0.22", "GlobalPay.exe"));
        bad = asset.clone(); bad.size = MAX_SIZE + 1; assert!(!valid_asset(&bad, "v1.0.22", "GlobalPay.exe"));
        for url in ["http://github.com/file", "https://github.com.evil.test/file", "https://github.com@evil.test/file", "https://github.com:444/file"] { assert!(!trusted_host(&reqwest::Url::parse(url).unwrap())); }
        assert!(trusted_host(&reqwest::Url::parse("https://release-assets.githubusercontent.com/file").unwrap()));
    }
    #[test] fn verifies_size_and_hash_again_before_install() {
        let directory = tempfile::tempdir().unwrap(); let path = directory.path().join("update"); fs::write(&path, b"safe").unwrap();
        let mut asset = Asset { name: "test".into(), size: 4, digest: Some(format!("sha256:{:x}", Sha256::digest(b"safe"))), browser_download_url: String::new() };
        assert!(verify(&path, &asset).is_ok());
        fs::write(&path, b"evil").unwrap(); assert!(verify(&path, &asset).is_err());
        asset.size = 5; assert!(verify(&path, &asset).is_err());
    }
    #[test] fn archive_cannot_escape_staging_or_write_through_symlinks() {
        use zip::{write::SimpleFileOptions, ZipWriter};
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join("update.zip");
        for name in ["GlobalPay.app/Contents/Info.plist", "../outside", "/tmp/outside", "Other.app/Contents/Info.plist", "GlobalPay.app/../../outside", "GlobalPay.app\\..\\outside"] {
            let mut zip = ZipWriter::new(fs::File::create(&file).unwrap());
            zip.start_file(name, SimpleFileOptions::default()).unwrap(); zip.write_all(b"test").unwrap(); zip.finish().unwrap();
            assert_eq!(validate_archive(&file).is_ok(), name == "GlobalPay.app/Contents/Info.plist", "{name}");
        }
        let mut zip = ZipWriter::new(fs::File::create(&file).unwrap());
        zip.add_symlink("GlobalPay.app/Contents/link", "../../../../outside", SimpleFileOptions::default()).unwrap(); zip.finish().unwrap();
        assert!(validate_archive(&file).is_err());
    }
}
