#!/usr/bin/env node
/**
 * Cut the 60 s trailer from `scripts/trailer60.json`: the Caral intro, five acts with one title card each,
 * a small lower third per shot (hero and place), the gameplay montage with one word per shot and the end
 * card. Shots marked `"grade": "night"` get a day-for-night grade (the fire stays the brightest thing).
 * Gameplay shots keep their HUD, so the letterbox opens while they play.
 *
 * Usage:
 *   python3 scripts/trailer60_music.py --out=review/trailer60_music.wav
 *   node scripts/trailer60_edit.mjs --format=16x9 [--out=review/trailer60-16x9.mp4]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { cliArg, reviewDir } from './lib.mjs';

const PLAN = JSON.parse(
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'trailer60.json'), 'utf8'),
);
const FPS = PLAN.fps;
const GOLD = '0xE8C36A';
const CREAM = '0xF6EAC8';
const DISPLAY = '/usr/share/fonts/truetype/noto/NotoSerifDisplay-Bold.ttf';
const GEORGIA = '/usr/share/fonts/truetype/msttcorefonts/Georgia_Bold.ttf';
const SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const format = cliArg('format', '16x9');
const vertical = format === '9x16';
const dir = path.resolve(cliArg('dir', path.join(reviewDir(), `trailer60-${format}`)));
const epic = path.join(reviewDir(), `trailer-epic-${format}`);
const music = path.resolve(cliArg('music', path.join(reviewDir(), 'trailer60_music.wav')));
const out = path.resolve(cliArg('out', path.join(reviewDir(), `trailer60-${format}.mp4`)));
const cover = out.replace(/\.mp4$/i, '-cover.jpg');
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const GRADES = {
  // Day for night: darker and cooler mids and shadows; highlights (the fire) keep their colour.
  night:
    'eq=brightness=-0.03:contrast=1.06:saturation=0.85:gamma=0.9,colorbalance=rs=-0.07:gs=-0.02:bs=0.09:rm=-0.04:gm=-0.01:bm=0.06',
};

const folderOf = (name) => (name.startsWith('epic:') ? path.join(epic, name.slice(5)) : path.join(dir, name));

/** Segments in order: { folder, seconds, start, grade, kind, ... } with their start time `t`. */
const segments = [];
let t = 0;
const push = (seg) => {
  segments.push({ ...seg, t });
  t += seg.seconds;
};
push({ kind: 'intro', folder: folderOf(PLAN.intro.folder), seconds: PLAN.intro.seconds, start: PLAN.intro.start });
PLAN.acts.forEach((act, ai) =>
  act.shots.forEach((s, si) =>
    push({ kind: 'shot', act: ai, first: si === 0, folder: folderOf(s.name), seconds: s.seconds, start: 4, ...s }),
  ),
);
PLAN.montage.shots.forEach((s) =>
  push({ kind: 'montage', folder: folderOf(s.name), seconds: s.seconds, start: 4, ...s }),
);
const END = t;
push({ kind: 'end', folder: folderOf(PLAN.end.folder), seconds: PLAN.end.seconds, start: PLAN.end.start });
const TOTAL = t;

const tmp = path.join(dir, 'edit');
fs.mkdirSync(tmp, { recursive: true });

function run(args) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: 'inherit' });
}

function encodeSegments() {
  const files = [];
  segments.forEach((seg, i) => {
    if (!fs.existsSync(seg.folder)) throw new Error(`missing shot ${seg.folder}`);
    const frames = Math.round(seg.seconds * FPS);
    const available = fs.readdirSync(seg.folder).filter((f) => f.endsWith('.jpg')).length;
    const start = Math.max(0, Math.min(seg.start, available - frames));
    const file = path.join(tmp, `${String(i).padStart(2, '0')}.mp4`);
    // A shot a little short of its slot holds its last frame.
    const pad = Math.max(0, frames - (available - start));
    const filters = [
      `scale=${vertical ? '1080:1920' : '1920:1080'}`,
      ...(seg.grade ? [GRADES[seg.grade]] : []),
      ...(pad ? [`tpad=stop_mode=clone:stop=${pad}`] : []),
    ];
    run([
      '-framerate',
      String(FPS),
      '-start_number',
      String(start),
      '-i',
      path.join(seg.folder, '%05d.jpg'),
      '-vf',
      filters.join(','),
      '-frames:v',
      String(frames),
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '15',
      '-pix_fmt',
      'yuv420p',
      file,
    ]);
    files.push(file);
  });
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, files.map((f) => `file '${f}'`).join('\n'));
  return list;
}

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/%/g, '\\%');

function text(str, { font, size, color = CREAM, y, from, to, spacing = 0, pop = false, border = 0 }) {
  const fade = 0.2;
  const alpha = `if(lt(t,${from + fade}),max(0,(t-${from})/${fade}),if(lt(t,${to - fade}),1,max(0,(${to}-t)/${fade})))`;
  const fs = pop ? `${size}*(1+0.2*max(0,1-(t-${from})/0.18))` : `${size}`;
  const spaced = spacing ? str.split('').join(' '.repeat(spacing)) : str;
  return (
    `drawtext=fontfile=${font}:text='${esc(spaced)}':fontcolor=${color}:fontsize='${fs}'` +
    `:shadowcolor=black@0.75:shadowx=0:shadowy=${Math.max(2, Math.round(size / 18))}` +
    (border ? `:borderw=${border}:bordercolor=black@0.35` : '') +
    `:x=(w-text_w)/2:y=${y}-text_h/2:alpha='${alpha}':enable='between(t,${from},${to})'`
  );
}

function gradeAndTitles(list) {
  const k = vertical ? 0.8 : 1;
  const titles = [];
  const bands = [];
  const flashes = [];
  const hud = [];
  for (const seg of segments) {
    const { t: s0, seconds } = seg;
    const s1 = s0 + seconds;
    if (seg.kind === 'intro') {
      titles.push(
        text('ESTRATEGIA EN TIEMPO REAL', {
          font: SANS,
          size: Math.round(32 * k),
          color: GOLD,
          y: 'h*0.38',
          from: 0.3,
          to: s1 - 0.1,
          spacing: 1,
          border: 2,
        }),
        text('5.000 AÑOS DE HISTORIA', {
          font: DISPLAY,
          size: Math.round((vertical ? 92 : 112) * 1),
          y: vertical ? 'h*0.44' : 'h*0.48',
          from: 0.5,
          to: s1 - 0.1,
          pop: true,
          border: 2,
        }),
      );
      bands.push([0.3, s1 - 0.1, vertical ? 0.34 : 0.3, vertical ? 0.14 : 0.24]);
    }
    if (seg.kind === 'shot') {
      if (seg.first) {
        // One card per act, over its first shot.
        titles.push(
          text(`ACTO ${ROMAN[seg.act]}`, {
            font: SANS,
            size: Math.round(30 * k),
            color: GOLD,
            y: vertical ? 'h*0.17' : 'h*0.19',
            from: s0 + 0.1,
            to: s0 + 2.1,
            spacing: 1,
            border: 2,
          }),
          text(PLAN.acts[seg.act].title, {
            font: DISPLAY,
            size: vertical ? 70 : 92,
            y: vertical ? 'h*0.21' : 'h*0.27',
            from: s0 + 0.2,
            to: s0 + 2.1,
            pop: true,
            border: 2,
          }),
        );
        bands.push([s0 + 0.1, s0 + 2.1, vertical ? 0.14 : 0.13, vertical ? 0.11 : 0.2]);
        flashes.push([s0, 0.12, 0.5]);
      }
      // A small lower third: the hero in the display face, the place under it.
      const from = s0 + 0.35;
      const to = s1 - 0.15;
      const y = vertical ? 0.8 : 0.83;
      if (seg.hero) {
        titles.push(
          text(seg.hero.toUpperCase(), { font: DISPLAY, size: Math.round(40 * k), y: `h*${y}`, from, to, border: 2 }),
          text(seg.place.toUpperCase(), {
            font: SANS,
            size: Math.round(22 * k),
            color: GOLD,
            y: `h*${y + (vertical ? 0.025 : 0.045)}`,
            from: from + 0.1,
            to,
            spacing: 1,
            border: 2,
          }),
        );
      } else {
        titles.push(
          text(seg.place.toUpperCase(), {
            font: SANS,
            size: Math.round(24 * k),
            color: GOLD,
            y: `h*${y + (vertical ? 0.012 : 0.02)}`,
            from,
            to,
            spacing: 1,
            border: 2,
          }),
        );
      }
      if (seg.name.startsWith('caral')) hud.push([s0, s1]);
    }
    if (seg.kind === 'montage') {
      titles.push(
        text(seg.text, {
          font: DISPLAY,
          size: vertical ? 120 : 150,
          y: 'h*0.45',
          from: s0 + 0.05,
          to: s1,
          pop: true,
          border: 3,
        }),
      );
      flashes.push([s0, 0.1, 0.55]);
      hud.push([s0, s1]);
    }
    if (seg.kind === 'end') {
      titles.push(
        text('EDADES DEL PERÚ', {
          font: GEORGIA,
          size: vertical ? 96 : 124,
          y: vertical ? 'h*0.36' : 'h*0.34',
          from: s0 + 0.1,
          to: TOTAL,
          pop: true,
          border: 3,
        }),
        text('ESTRATEGIA HISTÓRICA EN TIEMPO REAL', {
          font: SANS,
          size: vertical ? 24 : 34,
          color: GOLD,
          y: vertical ? 'h*0.42' : 'h*0.46',
          from: s0 + 0.5,
          to: TOTAL,
          spacing: 1,
        }),
        text('5 CAMPAÑAS · 20 MISIONES · DE CARAL A LA BREÑA', {
          font: SANS,
          size: vertical ? 24 : 30,
          y: vertical ? 'h*0.46' : 'h*0.53',
          from: s0 + 0.8,
          to: TOTAL,
        }),
        text('JUEGA GRATIS EN TU NAVEGADOR', {
          font: DISPLAY,
          size: vertical ? 54 : 60,
          color: GOLD,
          y: vertical ? 'h*0.56' : 'h*0.65',
          from: s0 + 1.3,
          to: TOTAL,
          pop: true,
          border: 2,
        }),
        text('joseamaya.github.io/edades-del-peru', {
          font: SANS,
          size: vertical ? 30 : 32,
          y: vertical ? 'h*0.61' : 'h*0.74',
          from: s0 + 1.6,
          to: TOTAL,
        }),
      );
      flashes.push([s0, 0.22, 0.85]);
    }
  }
  // The letterbox (16:9) opens while a gameplay shot shows its HUD.
  const noHud = hud.map(([a, b]) => `between(t,${a},${b})`).join('+') || '0';
  const filters = [
    'eq=contrast=1.12:saturation=1.2:gamma=1.05',
    'colorbalance=rs=0.03:bs=-0.04:rh=0.04:bh=-0.05',
    'vignette=PI/5',
    'unsharp=5:5:0.6:5:5:0.0',
    ...(vertical
      ? []
      : [
          `drawbox=x=0:y=0:w=iw:h=ih*0.07:color=black:t=fill:enable='not(${noHud})'`,
          `drawbox=x=0:y=ih*0.93:w=iw:h=ih*0.07:color=black:t=fill:enable='not(${noHud})'`,
        ]),
    `drawbox=x=0:y=0:w=iw:h=ih:color=black@0.5:t=fill:enable='between(t,${END},${TOTAL})'`,
    ...bands.map(
      ([from, to, y, h]) =>
        `drawbox=x=0:y=ih*${y.toFixed(3)}:w=iw:h=ih*${h}:color=black@0.32:t=fill:enable='between(t,${from},${to})'`,
    ),
    ...flashes.map(
      ([at, d, a]) => `drawbox=x=0:y=0:w=iw:h=ih:color=white@${a}:t=fill:enable='between(t,${at},${at + d})'`,
    ),
    'fade=t=in:st=0:d=0.5',
    `fade=t=out:st=${TOTAL - 0.7}:d=0.7`,
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

const list = encodeSegments();
mux(gradeAndTitles(list));
run(['-ss', String(END + 3), '-i', out, '-frames:v', '1', '-q:v', '2', cover]);
console.log(
  `[t60-edit] ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB, ${TOTAL.toFixed(1)} s) + ${path.basename(cover)}`,
);
