import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const outputPath = join(rootDir, 'lib', 'generatedVersion.ts');
const baseCommitCount = 22;

let commitCount = baseCommitCount;

try {
  commitCount = Number(execSync('git rev-list --count HEAD', { cwd: rootDir, encoding: 'utf8' }).trim());
} catch {
  commitCount = baseCommitCount;
}

const patchNumber = Math.max(0, commitCount - baseCommitCount);
const appVersion = (1 + patchNumber / 100).toFixed(2);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `export const appVersion = '${appVersion}';\n`);
