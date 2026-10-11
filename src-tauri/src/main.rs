#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod updater;

fn main() {
  tauri::Builder::default()
    .manage(updater::Updater::default())
    .invoke_handler(tauri::generate_handler![updater::update_check, updater::update_download, updater::update_install])
    .setup(|app| {
      let handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        tauri::async_runtime::spawn_blocking(move || {
          std::thread::sleep(std::time::Duration::from_secs(30));
          updater::finish_update(&handle);
        }).await.ok();
      });
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
