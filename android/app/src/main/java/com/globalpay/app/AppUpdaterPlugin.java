package com.globalpay.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** Kaze-style native download + Android installation confirmation. Never clears app data. */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean busy = new AtomicBoolean();
    private JSONObject asset;
    private String version;

    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        if (!busy.compareAndSet(false, true)) { call.reject("update_busy"); return; }
        executor.execute(() -> {
            try {
                asset = null;
                HttpURLConnection connection = open(UpdateSecurity.API, true);
                JSONObject release;
                try (InputStream input = connection.getInputStream(); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[8192]; int count;
                    while ((count = input.read(buffer)) != -1) {
                        if (bytes.size() + count > 1_000_000) throw new IOException("release_invalid");
                        bytes.write(buffer, 0, count);
                    }
                    release = new JSONObject(bytes.toString(StandardCharsets.UTF_8.name()));
                } finally { connection.disconnect(); }
                String tag = release.getString("tag_name");
                if (release.optBoolean("draft") || release.optBoolean("prerelease") || !tag.matches("v?\\d+\\.\\d+\\.\\d+")) throw new IOException("release_invalid");
                PackageInfo installed = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
                boolean available = UpdateSecurity.newer(tag, installed.versionName);
                if (available) {
                    JSONArray assets = release.getJSONArray("assets");
                    for (int i = 0; i < assets.length(); i++) {
                        JSONObject candidate = assets.getJSONObject(i);
                        if ("GlobalPay.apk".equals(candidate.optString("name")) && UpdateSecurity.trustedAsset(candidate.optString("browser_download_url"), tag, candidate.optString("digest"), candidate.optLong("size"))) asset = candidate;
                    }
                    if (asset == null) throw new IOException("release_invalid");
                }
                version = tag.replaceFirst("^v", "");
                JSObject result = new JSObject();
                result.put("available", available); result.put("version", version); result.put("platform", "android");
                busy.set(false); call.resolve(result);
            } catch (Exception error) { busy.set(false); call.reject("update_check_failed", error); }
        });
    }

    @PluginMethod
    public void downloadUpdate(PluginCall call) {
        if (!busy.compareAndSet(false, true)) { call.reject("update_busy"); return; }
        executor.execute(() -> {
            File apk = apkFile();
            try {
                if (asset == null) throw new IOException("release_invalid");
                File directory = apk.getParentFile();
                if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("update_download_failed");
                // A permission cancellation can be retried without downloading again.
                if (apk.isFile()) {
                    try { validate(apk); progress(100); busy.set(false); call.resolve(new JSObject()); return; }
                    catch (Exception ignored) { if (!apk.delete()) throw new IOException("update_download_failed"); }
                }
                HttpURLConnection connection = open(asset.getString("browser_download_url"), false);
                long expected = asset.getLong("size"), received = 0; int lastPercent = -1;
                try (InputStream input = new BufferedInputStream(connection.getInputStream()); FileOutputStream output = new FileOutputStream(apk)) {
                    byte[] buffer = new byte[16384]; int count;
                    while ((count = input.read(buffer)) != -1) {
                        received += count;
                        if (received > expected) throw new IOException("update_invalid");
                        output.write(buffer, 0, count);
                        int percent = (int) (received * 100 / expected);
                        if (percent != lastPercent) { lastPercent = percent; progress(percent); }
                    }
                    output.getFD().sync();
                } finally { connection.disconnect(); }
                validate(apk); progress(100); busy.set(false); call.resolve(new JSObject());
            } catch (Exception error) {
                if (apk.exists()) apk.delete();
                busy.set(false); call.reject("update_download_failed", error);
            }
        });
    }

    @PluginMethod
    public void installUpdate(PluginCall call) {
        if (!busy.compareAndSet(false, true)) { call.reject("update_busy"); return; }
        executor.execute(() -> {
            try {
                validate(apkFile());
                getActivity().runOnUiThread(() -> {
                    try {
                        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
                            Intent permission = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
                            startActivityForResult(call, permission, "unknownSourcesResult");
                        } else openInstaller(call);
                    } catch (Exception error) { busy.set(false); call.reject("update_install_failed", error); }
                });
            } catch (Exception error) { busy.set(false); call.reject("update_invalid", error); }
        });
    }

    @ActivityCallback
    private void unknownSourcesResult(PluginCall call, ActivityResult result) {
        if (call == null) { busy.set(false); return; }
        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
            busy.set(false); call.reject("install_permission_required"); return;
        }
        // Revalidate after returning from Settings, rather than trusting a stale file.
        busy.set(false);
        installUpdate(call);
    }

    private void openInstaller(PluginCall call) {
        try {
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apkFile());
            Intent intent = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(intent);
            busy.set(false); call.resolve(new JSObject());
        } catch (Exception error) { busy.set(false); call.reject("update_install_failed", error); }
    }

    private File apkFile() { return new File(getContext().getCacheDir(), "updates/GlobalPay.apk"); }

    @SuppressWarnings("deprecation")
    private void validate(File apk) throws Exception {
        if (asset == null || !apk.isFile() || apk.length() != asset.getLong("size")) throw new IOException("update_invalid");
        MessageDigest hash = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new FileInputStream(apk)) {
            byte[] buffer = new byte[16384]; int count;
            while ((count = input.read(buffer)) != -1) hash.update(buffer, 0, count);
        }
        StringBuilder hex = new StringBuilder("sha256:");
        for (byte b : hash.digest()) hex.append(String.format("%02x", b & 0xff));
        if (!hex.toString().equalsIgnoreCase(asset.getString("digest"))) throw new IOException("update_invalid");
        PackageManager manager = getContext().getPackageManager();
        int flags = Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        PackageInfo fresh = manager.getPackageArchiveInfo(apk.getAbsolutePath(), flags);
        PackageInfo installed = manager.getPackageInfo(getContext().getPackageName(), flags);
        if (fresh == null || !installed.packageName.equals(fresh.packageName) || !version.equals(fresh.versionName)
            || !UpdateSecurity.newer(fresh.versionName, installed.versionName)) throw new IOException("update_invalid");
        long freshCode = Build.VERSION.SDK_INT >= 28 ? fresh.getLongVersionCode() : fresh.versionCode;
        long oldCode = Build.VERSION.SDK_INT >= 28 ? installed.getLongVersionCode() : installed.versionCode;
        if (freshCode <= oldCode) throw new IOException("update_invalid");
        Signature[] oldSigners = Build.VERSION.SDK_INT >= 28 ? installed.signingInfo.getApkContentsSigners() : installed.signatures;
        Signature[] newSigners = Build.VERSION.SDK_INT >= 28 ? fresh.signingInfo.getApkContentsSigners() : fresh.signatures;
        if (oldSigners == null || newSigners == null || oldSigners.length == 0 || oldSigners.length != newSigners.length
            || !Arrays.asList(newSigners).containsAll(Arrays.asList(oldSigners))) throw new IOException("update_invalid");
    }

    private HttpURLConnection open(String source, boolean metadata) throws Exception {
        URL url = new URL(source);
        for (int i = 0; i < 8; i++) {
            if (metadata ? !UpdateSecurity.API.equals(url.toString()) : !UpdateSecurity.trustedRedirect(url.toString())) throw new IOException("release_invalid");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(15000); connection.setReadTimeout(30000);
            connection.setInstanceFollowRedirects(false);
            connection.setUseCaches(false);
            connection.setRequestProperty("Cache-Control", "no-cache");
            connection.setRequestProperty("User-Agent", "GlobalPay-Android");
            connection.setRequestProperty("Accept", metadata ? "application/vnd.github+json" : "application/octet-stream");
            int code = connection.getResponseCode();
            if (code == 200) return connection;
            String location = connection.getHeaderField("Location"); connection.disconnect();
            if (!metadata && (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) && location != null) url = new URL(url, location);
            else throw new IOException("update_download_failed");
        }
        throw new IOException("release_invalid");
    }

    private void progress(int percent) {
        JSObject payload = new JSObject(); payload.put("percent", percent);
        notifyListeners("downloadProgress", payload);
    }
}
