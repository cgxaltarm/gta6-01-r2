// VELAMAR entrypoint (Node 22, standard library only).
// Packages the playable browser game and screenshot renders into the output
// directory, then emits a deterministic dossier.json for the make.fun scorer.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(src: string, dst: string): void {
  if (!existsSync(src)) return;
  mkdirSync(dst, { recursive: true });
  cpSync(src, dst, { recursive: true });
}

const gameSrc = join(rootDir, 'game');
if (!existsSync(gameSrc)) {
  throw new Error('Missing required game/ directory');
}

const shotsSrc = join(rootDir, 'screenshots');
mkdirSync(outputDir, { recursive: true });
copyTree(gameSrc, join(outputDir, 'game'));
copyTree(shotsSrc, join(outputDir, 'screenshots'));

if (existsSync(shotsSrc)) {
  const shotCount = readdirSync(shotsSrc).filter((f) => /\.(png|jpe?g)$/i.test(f)).length;
  if (shotCount === 0) {
    console.warn('No screenshot images found in screenshots/; dossier may be invalid.');
  }
}

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`VELAMAR packaged to ${outputDir} (${dossier.byteLength} bytes dossier)`);
