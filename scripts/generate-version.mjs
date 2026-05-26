import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const outputPath = join(rootDir, 'lib', 'generatedVersion.ts');
const DEFAULT_VERSION = '1.0000';

const readCommittedVersion = () => {
  if (!existsSync(outputPath)) return DEFAULT_VERSION;

  const currentSource = readFileSync(outputPath, 'utf8');
  return currentSource.match(/appVersion = '([^']+)'/)?.[1] ?? DEFAULT_VERSION;
};

const incrementVersion = (version) => {
  const numeric = Number.parseFloat(version);
  if (!Number.isFinite(numeric)) return DEFAULT_VERSION;
  return (numeric + 0.0001).toFixed(4);
};

const bump = process.argv.includes('--bump');
let appVersion = readCommittedVersion();

if (bump) {
  appVersion = incrementVersion(appVersion);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `export const appVersion = '${appVersion}';\n`);
console.log(`ChemDeck app version: ${appVersion}${bump ? ' (bumped +0.0001)' : ''}`);
