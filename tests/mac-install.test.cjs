const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Exercise replacement/rollback using only disposable fixture directories.
// Substitute the launcher in a generated copy so these tests never open a real app.
for (const launchSucceeds of [true, false]) test(`Mac replacement ${launchSucceeds ? 'retains backup after success' : 'rolls back after launch failure'}`, { skip: process.platform === 'win32' }, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'globalpay-helper-test-'));
  try {
    const old = path.join(root, 'GlobalPay.app');
    const fresh = path.join(root, 'stage', 'GlobalPay.app');
    const backup = path.join(root, 'backup.app');
    const status = path.join(root, 'status');
    fs.mkdirSync(old);
    fs.mkdirSync(fresh, { recursive: true });
    fs.writeFileSync(path.join(old, 'version'), 'old');
    fs.writeFileSync(path.join(fresh, 'version'), 'new');
    const source = fs.readFileSync(path.join(__dirname, '../src-tauri/src/mac-install.sh'), 'utf8');
    const helper = path.join(root, 'fixture-install.sh');
    fs.writeFileSync(helper, source.replaceAll('/usr/bin/open -n -a "$old"', launchSucceeds ? 'true' : 'false'));
    const result = spawnSync('/bin/sh', [helper, old, fresh, backup, '2147483647', status]);
    assert.equal(result.status, launchSucceeds ? 0 : 1);
    assert.equal(fs.readFileSync(status, 'utf8').trim(), launchSucceeds ? 'installed' : 'failed-launch');
    assert.equal(fs.readFileSync(path.join(old, 'version'), 'utf8'), launchSucceeds ? 'new' : 'old');
    if (launchSucceeds) assert.equal(fs.readFileSync(path.join(backup, 'version'), 'utf8'), 'old');
    else assert.equal(fs.readFileSync(path.join(fresh, 'version'), 'utf8'), 'new');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
