const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

// cmd.exe does not expand shell globs. Pass explicit files on every platform.
const directory = join(__dirname, '../tests');
const files = readdirSync(directory).filter(name => name.endsWith('.test.cjs')).sort().map(name => join(directory, name));
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
