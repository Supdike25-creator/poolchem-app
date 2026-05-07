import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const outputPath = join(rootDir, 'lib', 'generatedVersion.ts');
const baseCommitCount = 25;

const readCommittedVersion = () => {
  if (!existsSync(outputPath)) return '1.00';

  const currentSource = readFileSync(outputPath, 'utf8');
  return currentSource.match(/appVersion = '([^']+)'/)?.[1] ?? '1.00';
};

let appVersion = readCommittedVersion();

try {
  const commitCount = Number(execSync('git rev-list --count HEAD', { cwd: rootDir, encoding: 'utf8' }).trim());
  const patchNumber = Math.max(0, commitCount - baseCommitCount);
  appVersion = (1 + patchNumber / 100).toFixed(2);
} catch {
  // Vercel builds may not expose Git history. Keep the committed generated version.
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `export const appVersion = '${appVersion}';\n`);
