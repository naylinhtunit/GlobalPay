# Downloads — Unsigned Builds

- **Android**: `GlobalPay.apk` — Direct download, allow "Install unknown apps" on first open.
  - Build: `npm run build:android && npm run android:build`
  - Output: `public/downloads/GlobalPay.apk` served at `/downloads/GlobalPay.apk`

- **macOS**: `GlobalPay.dmg` — Unsigned. On first open: Right-click → Open → Allow. Or `xattr -cr /Applications/GlobalPay.app`
  - Build: `npm run tauri:build` (requires Rust + Xcode). Outputs to `src-tauri/target/release/bundle/dmg/`
  - Copy to `public/downloads/GlobalPay.dmg`

- **Windows**: `GlobalPay.exe` — Unsigned. SmartScreen will warn → "More info" → "Run anyway"
  - Build: `cargo tauri build` on Windows or cross-compile. Outputs to `src-tauri/target/release/bundle/nsis/` and `msi/`
  - Copy to `public/downloads/GlobalPay.exe`

Landing page (`/` ) is web-only. Native apps auto-redirect `/` → `/login` via Capacitor/Tauri detection.
