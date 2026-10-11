const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { updateErrorKey, isNativeUpdaterAvailable } = require('../src/lib/native-updater.ts');
const { hasTranslation } = require('../src/lib/i18n.ts');

test('browser builds never offer native downloads or execution', () => {
  assert.equal(isNativeUpdaterAvailable(), false);
  const component = fs.readFileSync('src/components/updater/AppUpdater.tsx', 'utf8');
  assert.doesNotMatch(component, /window\.open|localStorage\.setItem/);
  assert.match(component, /Save any unfinished payroll forms/);
});
test('native update errors have all three display languages', () => {
  for (const code of ['install_permission_required', 'update_move_to_applications', 'update_location_readonly', 'update_invalid', 'release_invalid', 'update_platform_unavailable', 'update_install_failed', 'offline']) {
    assert.equal(hasTranslation(updateErrorKey(new Error(code))), true, code);
  }
});
test('updates preserve native identity, origin and persisted authentication', () => {
  const tauri = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
  assert.equal(tauri.identifier, 'com.globalpay.desktop');
  assert.equal(tauri.productName, 'GlobalPay');
  const capacitor = fs.readFileSync('capacitor.config.ts', 'utf8');
  assert.match(capacitor, /appId: 'com\.globalpay\.app'/);
  assert.match(capacitor, /androidScheme: 'https'/);
  assert.doesNotMatch(capacitor, /hostname:/);
  const login = fs.readFileSync('src/app/login/page.tsx', 'utf8');
  assert.match(login, /await setPersistence\(auth, browserLocalPersistence\)/);
  assert.match(login, /if \(isUserLoading \|\| user\)/);
  const updater = fs.readFileSync('src-tauri/src/updater.rs', 'utf8') + fs.readFileSync('src-tauri/src/mac-install.sh', 'utf8') + fs.readFileSync('android/app/src/main/java/com/globalpay/app/AppUpdaterPlugin.java', 'utf8');
  assert.doesNotMatch(updater, /clearApplicationUserData|deleteDatabase|clearCache|clearWebStorage|signOut|localStorage\.clear/);
  assert.match(updater, /GET_SIGNING_CERTIFICATES/);
  assert.match(updater, /freshCode <= oldCode/);
});
