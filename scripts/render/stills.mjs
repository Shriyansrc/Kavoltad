#!/usr/bin/env node
// Render many review stills with one bundle.
//   node scripts/render/stills.mjs --frames=0,18,150 [--scale=0.5] [--out=out/stills] [--comp=KavoltKavey20s]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {existsSync, mkdirSync} from 'node:fs';
import path from 'node:path';

const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
};
const frames = arg('frames', '0').split(',').map(Number);
const scale = Number(arg('scale', '1'));
const out = arg('out', 'out/stills');
const comp = arg('comp', 'KavoltKavey20s');
const browserExecutable = process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

mkdirSync(out, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: comp, browserExecutable: existsSync(browserExecutable) ? browserExecutable : null});
for (const frame of frames) {
  const file = path.join(out, `f${String(frame).padStart(4, '0')}.png`);
  await renderStill({composition, serveUrl, frame, output: file, scale, imageFormat: 'png', browserExecutable: existsSync(browserExecutable) ? browserExecutable : null, chromiumOptions: {gl: 'swangle'}});
  console.log(file);
}
