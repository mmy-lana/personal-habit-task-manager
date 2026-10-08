/**
 * Copies non-TypeScript build inputs into `dist/` after `tsc` runs.
 *
 * `tsc` only emits JavaScript and declarations, so the generated Drizzle SQL
 * migrations have to be copied explicitly for the compiled migration runner
 * (`dist/migrate.js`) to find them at runtime.
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ASSETS = ['migrations'];

for (const asset of ASSETS) {
  const source = resolve(packageRoot, 'src', asset);
  const destination = resolve(packageRoot, 'dist', asset);

  if (!existsSync(source)) {
    process.stderr.write(
      `[database] expected asset folder "${source}" is missing. Run "pnpm db:generate" first.\n`,
    );
    process.exit(1);
  }

  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
  process.stdout.write(`[database] copied ${asset} -> ${destination}\n`);
}
