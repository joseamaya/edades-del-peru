import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { CAMPAIGNS } from '../src/campaign/defs/campaigns';
import { campaignMapSvg, fullView, layoutMapLabels } from '../src/ui/cinemaMap';

const cinemaMissions = MISSIONS.filter((m) => m.introStyle === 'cinema');
const releasedIds = CAMPAIGNS.flatMap((c) => c.releasedMissionIds);
// ADR 0008 budgets the full-HD stills at 160 KB each.
const MAX_STILL_BYTES = 160 * 1024;

describe('cinema intro', () => {
  it('is used by every released mission', () => {
    const missing = releasedIds.filter((id) => !cinemaMissions.some((m) => m.id === id));
    expect(missing).toEqual([]);
  });

  it('plays one map and two full-HD stills of the mission itself', async () => {
    for (const mission of cinemaMissions) {
      const beats = mission.intro ?? [];
      expect(beats.filter((b) => b.map).length, `${mission.id}: map beats`).toBe(1);
      const stills = beats.filter((b) => b.image).map((b) => b.image!);
      expect(stills.length, `${mission.id}: stills`).toBe(2);
      for (const still of stills) {
        expect(still, `${mission.id}: ${still}`).toMatch(/^media\/[a-z0-9-]+\/cine-[a-z0-9-]+\.webp$/);
        const file = path.join('public', still);
        expect(fs.existsSync(file), file).toBe(true);
        expect(fs.statSync(file).size, file).toBeLessThanOrEqual(MAX_STILL_BYTES);
        const meta = await sharp(file).metadata();
        expect([meta.width, meta.height], file).toEqual([1920, 1080]);
      }
    }
  });

  it('keeps every map mark and arrow inside the cropped view', () => {
    for (const mission of cinemaMissions) {
      for (const beat of mission.intro ?? []) {
        if (!beat.map) continue;
        const view = beat.map.view ?? fullView(mission.map.size);
        const inside = (p: { x: number; z: number }) =>
          p.x >= view.x && p.x <= view.x + view.size && p.z >= view.z && p.z <= view.z + view.size;
        for (const mark of beat.map.marks) expect(inside(mark), `${mission.id}: ${mark.label}`).toBe(true);
        for (const route of beat.map.routes) {
          for (const p of route.points) expect(inside(p), `${mission.id}: ${route.label ?? route.side}`).toBe(true);
        }
      }
    }
  });

  it('keeps every map label inside the view and clear of the other labels', () => {
    for (const mission of cinemaMissions) {
      for (const beat of mission.intro ?? []) {
        if (!beat.map) continue;
        const view = beat.map.view ?? fullView(mission.map.size);
        const { marks, routes } = layoutMapLabels(beat.map, view);
        const labels = [...marks, ...routes.filter((l) => l !== null)];
        for (const l of labels) {
          const b = l.box;
          const ok = b.x0 >= view.x && b.x1 <= view.x + view.size && b.y0 >= view.z && b.y1 <= view.z + view.size;
          expect(ok, `${mission.id}: «${l.text}» leaves the map`).toBe(true);
        }
        for (let i = 0; i < labels.length; i++) {
          for (let j = i + 1; j < labels.length; j++) {
            const a = labels[i]!.box;
            const b = labels[j]!.box;
            const clash = a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
            expect(clash, `${mission.id}: «${labels[i]!.text}» covers «${labels[j]!.text}»`).toBe(false);
          }
        }
      }
    }
  });

  it('gives every beat an image or a map, and a duration the subtitles can be read in', () => {
    for (const mission of cinemaMissions) {
      for (const beat of mission.intro ?? []) {
        expect(beat.image || beat.map, `${mission.id}: ${beat.title}`).toBeTruthy();
        // About 3 words a second is a comfortable reading pace for a subtitle.
        const words = beat.text.split(/\s+/).length;
        expect(beat.seconds ?? 8, `${mission.id}: ${beat.title}`).toBeGreaterThanOrEqual(Math.ceil(words / 3));
      }
    }
  });

  it('draws arrows and marks on the cropped view, escaping labels', () => {
    const svg = campaignMapSvg(
      {
        view: { x: 10, z: 20, size: 100 },
        marks: [{ x: 50, z: 50, label: 'A & <B>', side: 'place' }],
        routes: [
          {
            side: 'enemy',
            label: '1.ª',
            points: [
              { x: 20, z: 30 },
              { x: 60, z: 70 },
            ],
            delay: 1,
          },
        ],
      },
      { x: 10, z: 20, size: 100 },
    );
    expect(svg).toContain('viewBox="10 20 100 100"');
    expect(svg).toContain('A &amp; &lt;B&gt;');
    expect(svg).toMatch(/marker-end="url\(#cine-map-\d+-head-enemy\)"/);
    expect(svg).toContain('animation-delay:1s');
  });
});
