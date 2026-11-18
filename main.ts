// Lumen Drift's hand-in program (Node 22, standard library only). The playable game is the
// game/ directory beside this file: static HTML, ES modules and canvas-drawn art that open
// offline in a desktop browser. This program copies game/ and screenshots/ into the output
// directory and writes dossier.json, the summary the judge reads, with the vendored make.fun
// library.
//
// Locally, MAKEFUN_OUTPUT_DIR stands in for the grader's output directory:
//   $env:MAKEFUN_OUTPUT_DIR="out"; node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's caps: text_max_bytes trims the dossier text; the rest reject an entry the
// scorer would reject (too many or oversized screenshots, too many game/ entries or bytes,
// or a path under game/ that is too long).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
