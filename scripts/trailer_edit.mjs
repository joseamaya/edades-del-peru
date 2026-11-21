#!/usr/bin/env node
/**
 * Cut a captured trailer into shape: shot segments on the music grid, cinematic grade, titles, sound.
 *
 * Usage:
 *   node scripts/trailer_edit.mjs --dir=review/trailer-m_tambotoco-16x9 --format=16x9 \
 *     --music=review/trailer_music.wav --out=/home/jamaya/Vídeos/trailer-los-hijos-de-tambotoco-16x9.mp4
 *
 * The timeline is fixed (30 s at 30 fps) and every cut lands on the cue's half-second grid. Each shot
 * is encoded to its exact frame count first, then concatenated, graded, titled and muxed, so the
 * result never drifts by a frame.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { cliArg, reviewDir } from './lib.mjs';

const FPS = 30;
const GOLD = '0xE8C36A';
const CREAM = '0xF4E7C2';
const SERIF = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf';
const SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const dir = path.resolve(cliArg('dir', path.join(reviewDir(), 'trailer-m_tambotoco-16x9')));
const format = cliArg('format', '16x9');
const music = path.resolve(cliArg('music', path.join(reviewDir(), 'trailer_music.wav')));
const out = path.resolve(cliArg('out', `trailer-los-hijos-de-tambotoco-${format}.mp4`));
const cover = path.resolve(cliArg('cover', out.replace(/\.mp4$/i, '-cover.jpg')));

/** Timeline: shot, seconds on screen. 900 frames = 30 s. */
const TIMELINE = [
  ['cueva', 4.0],
  ['salida', 3.5],
  ['campamento', 2.5],
  ['marcha', 2.5],
  ['huanacaure', 3.3],
  ['acequia', 2.7],
  ['batalla', 3.0],
  ['inticancha', 2.5],
  ['canchas', 2.0],
  ['climax', 4.0],
];

const vertical = format === '9x16';
/** Title block position differs: the tall frame has room above the action. */
const TITLE_Y = vertical ? 'h*0.58' : 'h*0.66';

const tmp = path.join(dir, 'edit');
fs.mkdirSync(tmp, { recursive: true });
fs.mkdirSync(path.dirname(out), { recursive: true });

function run(args) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: 'inherit' });
}

function shotFolder(name) {
  const entry = fs
    .readdirSync(dir)
    .filter((d) => /^\d\d-/.test(d) && d.includes(`-${name}`))
    .sort()
    .pop();
  if (!entry) throw new Error(`missing shot ${name} in ${dir}`);
  return path.join(dir, entry);
}

function encodeSegments() {
  const files = [];
  for (const [name, seconds] of TIMELINE) {
    const folder = shotFolder(name);
    const frames = Math.round(seconds * FPS);
    const file = path.join(tmp, `${name}.mp4`);
    run([
      '-framerate',
      String(FPS),
      '-i',
      path.join(folder, '%05d.jpg'),
      '-frames:v',
      String(frames),
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '16',
      '-pix_fmt',
      'yuv420p',
      file,
    ]);
    files.push(file);
  }
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, files.map((f) => `file '${f}'`).join('\n') + '\n');
  return list;
}

/** One fading title: centred, gold/cream, letter-spaced by hand. */
function title(
  text,
  { font = SERIF, size = 64, color = CREAM, y = TITLE_Y, from = 0, to = 3, space = false, box = false },
) {
  const spaced = space ? text.split('').join(' ') : text;
  const plate = box ? ':box=1:boxcolor=black@0.38:boxborderw=16' : '';
  const alpha = () => `if(lt(t,${from + 0.35}),max(0,(t-${from})/0.35),if(lt(t,${to - 0.35}),1,max(0,(${to}-t)/0.35)))`;
  return (
    `drawtext=fontfile=${font}:text='${spaced}':fontcolor=${color}:fontsize=${size}${plate}` +
    `:x=(w-text_w)/2:y=${y}:alpha='${alpha()}':enable='between(t,${from},${to})'`
  );
}

function gradeAndTitles(list) {
  const titles = [
    title('PACARITAMBO', {
      size: vertical ? 30 : 40,
      color: GOLD,
      y: 'h*0.44',
      from: 0.6,
      to: 3.4,
      space: true,
      box: true,
    }),
    title('LA LEYENDA DE LOS AYAR', {
      size: vertical ? 38 : 58,
      y: 'h*0.5',
      from: 0.8,
      to: 3.4,
      space: true,
      box: true,
    }),
    title('HUANACAURE', { size: 54, color: GOLD, y: 'h*0.78', from: 12.9, to: 15.6, space: true, box: true }),
    title('INTICANCHA', { size: 54, color: GOLD, y: 'h*0.78', from: 21.8, to: 23.9, space: true, box: true }),
    title('LOS HIJOS DE TAMBOTOCO', { size: vertical ? 54 : 92, y: 'h*0.46', from: 26.6, to: 30, space: false }),
    title('EDADES DEL PERÚ', {
      font: SANS,
      size: vertical ? 34 : 40,
      color: GOLD,
      y: 'h*0.58',
      from: 26.9,
      to: 30,
      space: true,
    }),
    title('CAMPAÑA HISTÓRICA', { font: SANS, size: 22, color: CREAM, y: 'h*0.65', from: 27.2, to: 30, space: true }),
  ];
  const filters = [
    'eq=contrast=1.12:saturation=1.2:gamma=0.98',
    'vignette=PI/6',
    'unsharp=5:5:0.6:5:5:0.0',

    "drawbox=x=0:y=0:w=iw:h=ih:color=black@0.34:t=fill:enable='between(t,26.4,30)'",
    'fade=t=in:st=0:d=0.5',
    'fade=t=out:st=29.4:d=0.6',
    ...titles,
  ].join(',');
  run([
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    list,
    '-vf',
    filters,
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(FPS),
    path.join(tmp, 'graded.mp4'),
  ]);
  return path.join(tmp, 'graded.mp4');
}

function mux(video) {
  run([
    '-i',
    video,
    '-i',
    music,
    '-map',
    '0:v',
    '-map',
    '1:a',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '48000',
    '-shortest',
    '-movflags',
    '+faststart',
    out,
  ]);
}

function makeCover() {
  const folder = shotFolder('climax');
  const frames = fs.readdirSync(folder).sort();
  const still = path.join(folder, frames[Math.floor(frames.length * 0.7)]);
  const filters = [
    'eq=contrast=1.1:saturation=1.16',
    'vignette=PI/4.2',
    'drawbox=x=0:y=0:w=iw:h=ih:color=black@0.22:t=fill',
    `drawtext=fontfile=${SERIF}:text='LOS HIJOS':fontcolor=${CREAM}:fontsize=84:x=(w-text_w)/2:y=h*0.40`,
    `drawtext=fontfile=${SERIF}:text='DE TAMBOTOCO':fontcolor=${CREAM}:fontsize=84:x=(w-text_w)/2:y=h*0.48`,
    `drawtext=fontfile=${SANS}:text='EDADES DEL PERÚ':fontcolor=${GOLD}:fontsize=32:x=(w-text_w)/2:y=h*0.60`,
  ].join(',');
  run(['-i', still, '-vf', filters, '-frames:v', '1', '-q:v', '2', cover]);
}

const list = encodeSegments();
const video = gradeAndTitles(list);
mux(video);
makeCover();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`[edit] ${out}`);
console.log(`[edit] ${cover}`);
