#!/usr/bin/env node
// Render pipeline (cross-platform; uses Remotion's bundled ffmpeg).
//
//   node scripts/render/render.mjs final            full 1080×1920 master
//   node scripts/render/render.mjs draft            540×960 preview with audio
//   node scripts/render/render.mjs draft --frames=960-1019
//   node scripts/render/render.mjs encode           re-encode existing out/frames
//
// Final: Remotion renders lossless PNG frames, then ffmpeg encodes H.264
// (CRF 18, yuv420p, BT.709 matrix + tags, constant 60 fps) and muxes the
// -14 LUFS mix as stereo AAC 48 kHz 256 kbps with fast-start metadata.
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, rmSync} from 'node:fs';
import {join} from 'node:path';

const mode = process.argv[2] ?? 'draft';
const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
};
const frames = arg('frames', null);
const concurrency = arg('concurrency', process.env.REMOTION_CONCURRENCY ?? '3');
const shell = process.platform === 'win32';

const run = (cmd, args) => {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {stdio: 'inherit', shell});
  if (r.status !== 0) {
    console.error(`command failed (${r.status})`);
    process.exit(r.status ?? 1);
  }
};

const MIX = 'audio/Kavolt_Kavey_20s_Mix.wav';
if (!existsSync(MIX)) {
  console.error(`Missing ${MIX}. Run: node scripts/audio/build-audio.ts`);
  process.exit(1);
}

if (mode === 'final' || mode === 'encode') {
  const dir = 'out/frames';
  if (mode === 'final') {
    rmSync(dir, {recursive: true, force: true});
    mkdirSync(dir, {recursive: true});
    run('npx', [
      'remotion', 'render', 'src/index.ts', 'KavoltKavey20s', dir,
      '--sequence', '--image-format=png', `--concurrency=${concurrency}`,
      ...(frames ? [`--frames=${frames}`] : []),
    ]);
  }
  const pngs = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  if (!frames && pngs.length !== 1200) {
    console.error(`expected 1200 frames, found ${pngs.length}`);
    process.exit(1);
  }
  const pattern = pngs[0].replace(/\d+(?=\.png$)/, (m) => `%0${m.length}d`);
  const start = Number(/(\d+)\.png$/.exec(pngs[0])[1]);
  mkdirSync('deliverables', {recursive: true});
  const out = frames ? `out/final_${frames}.mp4` : 'deliverables/Kavolt_Kavey_20s_Final.mp4';
  const audioOffset = frames ? String(Number(frames.split('-')[0]) / 60) : '0';
  run('npx', [
    'remotion', 'ffmpeg', '-y', '-hide_banner',
    '-framerate', '60', '-start_number', String(start), '-i', join(dir, pattern),
    '-ss', audioOffset, '-i', MIX,
    '-map', '0:v:0', '-map', '1:a:0',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=spline+accurate_rnd+full_chroma_int,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-level:v', '4.2',
    '-x264-params', 'keyint=120:min-keyint=60:colorprim=bt709:transfer=bt709:colormatrix=bt709',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', '60', '-fps_mode', 'cfr',
    '-c:a', 'libfdk_aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
    '-shortest', '-movflags', '+faststart',
    out,
  ]);
  console.log(`\nwrote ${out}`);
} else {
  mkdirSync('out/draft', {recursive: true});
  const tag = frames ? frames : 'full';
  const silent = `out/draft/draft_${tag}_silent.mp4`;
  run('npx', [
    'remotion', 'render', 'src/index.ts', 'KavoltKavey20s', silent,
    '--scale=0.5', '--codec=h264', '--crf=20', '--muted', '--image-format=jpeg', '--jpeg-quality=92',
    `--concurrency=${concurrency}`, ...(frames ? [`--frames=${frames}`] : []),
  ]);
  const out = `out/draft/Kavolt_draft_${tag}.mp4`;
  const audioOffset = frames ? String(Number(frames.split('-')[0]) / 60) : '0';
  run('npx', [
    'remotion', 'ffmpeg', '-y', '-hide_banner', '-i', silent, '-ss', audioOffset, '-i', MIX,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out,
  ]);
  console.log(`\nwrote ${out}`);
}
