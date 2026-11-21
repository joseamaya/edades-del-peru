import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { campaignMapSvg, fullView } from '../src/ui/cinemaMap';

const cinemaMissions = MISSIONS.filter((m) => m.introStyle === 'cinema');

describe('cinema intro', () => {
  it('is used by the Tarapacá pilot', () => {
    expect(cinemaMissions.map((m) => m.id)).toContain('m_tarapaca');
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
