#!/usr/bin/env node
/**
 * Cut the saga trailer (first mission of each campaign) from `trailer_campaigns.mjs` footage.
 *
 * Usage:
 *   python3 scripts/trailer_music.py --out=review/trailer_saga_music.wav --cuts=3.5,6,8.5,11,13.5,16,18.5,21
 *   node scripts/trailer_saga_edit.mjs --format=9x16 --out=review/trailer-edades-del-peru-9x16.mp4
 *
 * 30 s at 30 fps; every cut lands on the cue's half-second grid (impacts at 22.5 s and 26 s).
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

const format = cliArg('format', '9x16');
const vertical = format === '9x16';
const dir = path.resolve(cliArg('dir', path.join(reviewDir(), `trailer-saga-${format}`)));
const music = path.resolve(cliArg('music', path.join(reviewDir(), 'trailer_saga_music.wav')));
const out = path.resolve(cliArg('out', path.join(reviewDir(), `trailer-edades-del-peru-${format}.mp4`)));
const cover = out.replace(/\.mp4$/i, '-cover.jpg');

/** Shot folder, seconds on screen, first frame used. */
const TIMELINE = [
  ['caral-wide', 3.5, 10],
  ['caral-aspero', 2.5, 10],
  ['tambotoco-cueva', 2.5, 10],
  ['tambotoco-marcha', 2.5, 10],
  ['lima-ciudad', 2.5, 10],
  ['lima-hueste', 2.5, 10],
  ['junta-cusco', 2.5, 10],
  ['junta-columnas', 2.5, 10],
  ['tarapaca-columna', 1.5, 10],
  ['tarapaca-batalla', 3.5, 0],
  ['caral-final', 4.0, 0],
];

/** Lower third: kicker (campaign) + line (mission · date). Social UI covers the bottom fifth. */
const LOWER_Y = vertical ? 0.66 : 0.76;
const LOWER = [
  [0.3, 3.4, 'CAMPAÑA I · CULTURAS PREINCAS', 'CARAL-SUPE · c. 3000 a.C.'],
  [6.15, 8.4, 'CAMPAÑA II · EL TAHUANTINSUYO', 'LOS HIJOS DE TAMBOTOCO'],
  [11.15, 13.4, 'CAMPAÑA III · EL VIRREINATO', 'LA CIUDAD DE LOS REYES · 1535'],
  [16.15, 18.4, 'CAMPAÑA IV · LA INDEPENDENCIA', 'LA JUNTA DEL CUSCO · 1814'],
  [21.05, 25.8, 'CAMPAÑA V · LA REPÚBLICA', 'TARAPACÁ · 1879'],
];

const tmp = path.join(dir, 'edit');
fs.mkdirSync(tmp, { recursive: true });
fs.mkdirSync(path.dirname(out), { recursive: true });

function run(args) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: 'inherit' });
}

function encodeSegments() {
  const files = [];
  for (const [name, seconds, startFrame] of TIMELINE) {
    const folder = path.join(dir, name);
    if (!fs.existsSync(folder)) throw new Error(`missing shot ${name} in ${dir}`);
    const frames = Math.round(seconds * FPS);
    const available = fs.readdirSync(folder).filter((f) => f.endsWith('.jpg')).length;
    const start = Math.max(0, Math.min(startFrame, available - frames));
    if (available < frames) throw new Error(`shot ${name} has ${available} frames, needs ${frames}`);
    const file = path.join(tmp, `${name}.mp4`);
    run([
      '-framerate',
      String(FPS),
      '-start_number',
      String(start),
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

function title(text, { font = SERIF, size = 64, color = CREAM, y, from, to, space = false, box = false }) {
  const spaced = space ? text.split('').join(' ') : text;
  const plate = box ? ':box=1:boxcolor=black@0.42:boxborderw=14' : '';
  const alpha = `if(lt(t,${from + 0.3}),max(0,(t-${from})/0.3),if(lt(t,${to - 0.3}),1,max(0,(${to}-t)/0.3)))`;
  return (
    `drawtext=fontfile=${font}:text='${spaced}':fontcolor=${color}:fontsize=${size}${plate}` +
    `:x=(w-text_w)/2:y=${y}:alpha='${alpha}':enable='between(t,${from},${to})'`
  );
}

function gradeAndTitles(list) {
  const k = vertical ? 1 : 1.1;
  const titles = [
    title('DE CARAL A LA BREÑA', {
      size: Math.round((vertical ? 58 : 76) * 1),
      y: `h*${vertical ? 0.4 : 0.38}`,
      from: 0.4,
      to: 3.3,
      box: true,
    }),
    ...LOWER.flatMap(([from, to, kicker, line]) => [
      title(kicker, {
        font: SANS,
        size: Math.round(24 * k),
        color: GOLD,
        y: `h*${LOWER_Y}`,
        from,
        to,
        space: true,
        box: true,
      }),
      title(line, {
        size: Math.round((vertical ? 46 : 52) * k),
        y: `h*${LOWER_Y + (vertical ? 0.03 : 0.05)}`,
        from,
        to,
        box: true,
      }),
    ]),
    title('EDADES DEL PERÚ', { size: vertical ? 82 : 104, y: `h*${vertical ? 0.38 : 0.36}`, from: 26.3, to: 30 }),
    title('ESTRATEGIA HISTÓRICA EN TIEMPO REAL', {
      font: SANS,
      size: vertical ? 30 : 34,
      color: GOLD,
      y: `h*${vertical ? 0.45 : 0.5}`,
      from: 26.6,
      to: 30,
      space: false,
    }),
    title('5 CAMPAÑAS · 20 MISIONES', {
      font: SANS,
      size: vertical ? 30 : 30,
      color: CREAM,
      y: `h*${vertical ? 0.49 : 0.57}`,
      from: 26.9,
      to: 30,
    }),
    title('Gratis en el navegador · joseamaya.github.io/edades-del-peru', {
      font: SANS,
      size: vertical ? 26 : 26,
      color: CREAM,
      y: `h*${vertical ? 0.56 : 0.66}`,
      from: 27.3,
      to: 30,
    }),
  ];
  const filters = [
    'eq=contrast=1.12:saturation=1.18:gamma=0.98',
    'vignette=PI/6',
    'unsharp=5:5:0.6:5:5:0.0',
    "drawbox=x=0:y=0:w=iw:h=ih:color=black@0.45:t=fill:enable='between(t,26.1,30)'",
    'fade=t=in:st=0:d=0.5',
    'fade=t=out:st=29.4:d=0.6',
    ...titles,
  ].join(',');
  const graded = path.join(tmp, 'graded.mp4');
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
    '20',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(FPS),
    graded,
  ]);
  return graded;
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
  const folder = path.join(dir, 'caral-wide');
  const frames = fs
    .readdirSync(folder)
    .filter((f) => f.endsWith('.jpg'))
    .sort();
  const still = path.join(folder, frames[Math.floor(frames.length * 0.85)]);
  const s = vertical ? 1 : 1.2;
  const filters = [
    'eq=contrast=1.1:saturation=1.16',
    'vignette=PI/4.2',
    'drawbox=x=0:y=0:w=iw:h=ih:color=black@0.3:t=fill',
    `drawtext=fontfile=${SERIF}:text='EDADES DEL PERÚ':fontcolor=${CREAM}:fontsize=${Math.round(84 * s)}:x=(w-text_w)/2:y=h*0.40`,
    `drawtext=fontfile=${SANS}:text='DE CARAL A LA BREÑA':fontcolor=${GOLD}:fontsize=${Math.round(36 * s)}:x=(w-text_w)/2:y=h*0.50`,
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
