import { describe, expect, it, vi } from 'vitest';
import { Discoveries, DISCOVERY_REVEAL_SECONDS, type DiscoveryFow, type DiscoverySite } from '../src/game/Discoveries';
import { ASPERO_HERITAGE_PROXY, getAuthoredSite } from '../src/model/defs/sites';

const caral = getAuthoredSite('caral_site')!;
const HUACA = ASPERO_HERITAGE_PROXY;

function fakeFow(explored = false): DiscoveryFow & {
  exploredAreas: { x: number; z: number; radius: number }[];
  setExplored: (value: boolean) => void;
} {
  const state = { explored };
  const exploredAreas: { x: number; z: number; radius: number }[] = [];
  return {
    exploredAreas,
    isExplored: vi.fn(() => state.explored),
    explore: vi.fn((x: number, z: number, radius: number) => exploredAreas.push({ x, z, radius })),
    setExplored: (value: boolean) => (state.explored = value),
  };
}

describe('site discoveries', () => {
  it('resolves the heritage proxy and names the site', () => {
    const discoveries = new Discoveries([{ heritageId: 'aspero_huaca_idolos', initial: true }], caral);
    expect(discoveries.sites).toHaveLength(1);
    const [site] = discoveries.sites;
    expect(site.name).toBe('Huaca de los Ídolos');
    expect(site.x).toBe(HUACA.x);
    expect(site.z).toBe(HUACA.z);
    expect(site.radius).toBeGreaterThan(10);
    expect(site.state).toBe('pending');
  });

  it('waits for the opening cinematic, then grows the fog clearing and finishes', () => {
    const discoveries = new Discoveries([{ heritageId: 'aspero_huaca_idolos', initial: true }], caral);
    const fow = fakeFow(false);
    const started: DiscoverySite[] = [];
    const onStart = (site: DiscoverySite): void => started.push(site);

    discoveries.update(0.1, fow, true, true, onStart);
    expect(discoveries.sites[0].state).toBe('pending');
    expect(started).toHaveLength(0);

    discoveries.update(0.1, fow, true, false, onStart);
    expect(discoveries.sites[0].state).toBe('revealing');
    expect(started.map((s) => s.name)).toEqual(['Huaca de los Ídolos']);
    const first = fow.exploredAreas.at(-1)!.radius;

    discoveries.update(DISCOVERY_REVEAL_SECONDS / 2, fow, true, false, onStart);
    expect(fow.exploredAreas.at(-1)!.radius).toBeGreaterThan(first);
    expect(discoveries.sites[0].state).toBe('revealing');

    discoveries.update(DISCOVERY_REVEAL_SECONDS, fow, true, false, onStart);
    expect(discoveries.sites[0].state).toBe('done');
  });

  it('announces an initial site even if starting vision already covers it', () => {
    const discoveries = new Discoveries([{ heritageId: 'aspero_huaca_idolos', initial: true }], caral);
    const fow = fakeFow(true);
    const onStart = vi.fn();
    discoveries.update(0.1, fow, true, false, onStart);
    expect(onStart).toHaveBeenCalledOnce();
    expect(discoveries.sites[0].state).toBe('revealing');
  });

  it('does not replay a discovery on a restored save whose fog already explored it', () => {
    const discoveries = new Discoveries([{ heritageId: 'aspero_huaca_idolos', initial: true }], caral, true);
    const fow = fakeFow(true);
    const onStart = vi.fn();
    discoveries.update(0.1, fow, true, false, onStart);
    expect(discoveries.sites[0].state).toBe('done');
    expect(onStart).not.toHaveBeenCalled();
    expect(fow.exploredAreas).toHaveLength(0);
  });

  it('still animates a site explored after load', () => {
    const discoveries = new Discoveries([{ heritageId: 'aspero_huaca_idolos' }], caral, true);
    const fow = fakeFow(false);
    const onStart = vi.fn();
    discoveries.update(0.1, fow, true, false, onStart);
    expect(discoveries.sites[0].state).toBe('pending');

    fow.setExplored(true);
    discoveries.update(0.1, fow, true, false, onStart);
    expect(onStart).toHaveBeenCalledOnce();
    expect(discoveries.sites[0].state).toBe('revealing');
  });

  it('waits for exploration when the site is not revealed at start', () => {
    const discoveries = new Discoveries([{ heritageId: 'aspero_huaca_idolos' }], caral);
    const fow = fakeFow(false);
    const onStart = vi.fn();
    discoveries.update(0.1, fow, true, false, onStart);
    expect(discoveries.sites[0].state).toBe('pending');
    expect(onStart).not.toHaveBeenCalled();

    fow.setExplored(true);
    discoveries.update(0.1, fow, true, false, onStart);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('does nothing while the fog of war is off', () => {
    const discoveries = new Discoveries([{ heritageId: 'aspero_huaca_idolos', initial: true }], caral);
    const fow = fakeFow(false);
    const onStart = vi.fn();
    discoveries.update(0.1, fow, false, false, onStart);
    expect(discoveries.sites[0].state).toBe('pending');
    expect(onStart).not.toHaveBeenCalled();
    expect(fow.exploredAreas).toHaveLength(0);
  });
});
