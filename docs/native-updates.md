# In-app updates

Android follows Kaze's native-download/Android-confirmation flow. Desktop follows
CodePlus's verified download, Mac replacement/relaunch and Windows installer flow.
The existing Capacitor and Tauri implementations stay in place (no Electron rewrite).

## User flow

- Native apps check on launch, foreground/online resume (10-minute throttle), and
  every six hours. Account → Check for updates bypasses the throttle. Browser/PWA
  builds do not offer APK/native execution.
- A newer stable version opens a translated update dialog. Dismissal lasts for the
  running session, not forever. Download requires confirming unfinished work is saved.
- Android downloads into private cache with progress, verifies the APK, requests
  per-app install permission if needed and opens Android's installer. The user must
  confirm installation; returning/canceling is **not** reported as installed.
  The verified cached download can be installed again without downloading twice.
- Mac downloads the architecture-specific ZIP, checks the bundle and stages beside
  the installed app. A detached helper waits for exit, atomically replaces the bundle
  and reopens it. Rename/launch failure rolls back to the previous app. The backup is
  removed only after the new matching version has run for 30 seconds. A failed update
  retains its backup/staging directory for recovery. Run from a writable Applications
  folder, not a mounted DMG or App Translocation.
- Windows downloads and verifies the NSIS installer, then opens the OS installer and
  exits GlobalPay. Follow its prompts; no silent UAC/install bypass is attempted.

## Login and data

Updates keep `com.globalpay.app` / `com.globalpay.desktop`, native origin/hostname,
Firebase configuration and WebView storage identity unchanged. They never uninstall
the app, clear storage, sign out, or touch employee/payroll records. Firebase uses
local auth persistence and waits for session restoration before showing login.
Explicit logout (and normal server-side revocation/expired credentials) still work.
Do not uninstall first or select removal of application data in an installer.

Users on 1.0.21 or older need one normal install-over-existing update to get the new
updater. The native bridge cannot be retrofitted into an already installed binary.

## Release contract

Use the public `naylinhtunit/GlobalPay-Releases` repo. Latest must be a non-draft,
non-prerelease `vMAJOR.MINOR.PATCH` with GitHub-generated `sha256:` digests and sizes:

- Android: `GlobalPay.apk`; preserve the existing signing certificate and increase
  both versionName and versionCode (1.0.24 = 25). Mismatched cert/package/version or
  same/lower versionCode is rejected before installation.
- Mac ARM64: `GlobalPay-macos-arm64.zip`; Intel: `GlobalPay-macos-x64.zip` only when
  built/tested for Intel. Never substitute ARM64 for Intel. Keep `GlobalPay.dmg` for
  first installs. Build with `APPLE_SIGNING_IDENTITY=-` for the current ad-hoc signing
  setup, then run `sh scripts/package-macos-update.sh [GlobalPay.app] [output-dir]`.
  ZIP must contain GlobalPay.app, no traversal/absolute paths or symlinks, and a valid
  strict code signature, matching bundle ID/version and CPU architecture.
- Windows x64: `GlobalPay.exe`. The Windows workflow produces it as before.

The native layer fetches release metadata itself. Renderer code cannot supply an
arbitrary URL, hash, file or executable. Only exact repository/tag/asset paths and
HTTPS redirects to GitHub asset hosts are allowed. Size and SHA-256 are checked after
download and immediately before installation. Partial files are not installed.

**Trust boundary:** like CodePlus, GitHub's HTTPS API/release repository is the trust
root. Its hash detects corrupt/substituted downloads, not a compromised publisher
account. Mac ad-hoc signing verifies bundle integrity, not publisher identity or Apple
notarization. This does not claim independent Tauri updater-signature authentication.
Keep GitHub publishing credentials protected. Android additionally requires the same
APK signing identity as the installed app.

Tests: `npm run test:payroll`, `npm run typecheck`,
`cargo test --manifest-path src-tauri/Cargo.toml`, Android `testDebugUnitTest`.
`node scripts/build-ui-fixtures.mjs` builds an isolated mock browser fixture for
company settings, annual rollover and updater consent/progress/retry testing. It
does not connect to Firebase or install apps. Generate its stylesheet with Tailwind
and serve its printed temporary directory on localhost.
Actual OS installer prompts still require device testing; automated tests do not
silently install over a user's current app or interrupt their open payroll form.
