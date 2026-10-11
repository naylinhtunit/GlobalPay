import { build } from 'esbuild';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const directory = await mkdtemp(join(tmpdir(), 'globalpay-update-qa-'));
const root = process.cwd();
const mocks = {
  '@/firebase': resolve('tests/ui/mock-firestore.ts'),
  'firebase/firestore': resolve('tests/ui/mock-firestore.ts'),
  '@/lib/native-updater': resolve('tests/ui/mock-native-updater.ts'),
};
await build({
  entryPoints: ['tests/ui/harness.tsx'], outfile: join(directory, 'fixture.js'), bundle: true,
  platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'isolated-fixtures', setup(builder) {
    builder.onResolve({ filter: /^(?:@\/firebase$|firebase\/firestore$|@\/lib\/native-updater$)/ }, args => ({ path: mocks[args.path] }));
    builder.onResolve({ filter: /^(?:next\/navigation|@\/components\/layout\/Navbar|@\/hooks\/use-toast)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'next/navigation' ? 'export const useRouter=()=>({replace(){},push(){}}); export const usePathname=()=>"/account";' : args.path.includes('Navbar') ? 'export const Navbar=()=>null;' : 'export const useToast=()=>({toast: console.info});', loader: 'js' }));
  }}],
});
// Generated test artifact, not application source. No real Firebase or native installs.
await writeFile(join(directory, 'index.html'), '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"></head><body><div id="root"></div><script src="fixture.js"></script></body></html>');
console.log(directory);
