import { artAssetSrcset, artAssetUrl, artReviewLabel } from '../art/manifest';
import type { ArtManifestRecord } from '../art/types';

function escapeHtml(value: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (char) => map[char]);
}

/** `?art=all` (or the legacy `?aiart=all`) previews drafts; default only shows reviewed assets. */
export function includeUnreviewedArt(): boolean {
  try {
    const params = new URLSearchParams(location.search);
    return params.get('art') === 'all' || params.get('aiart') === 'all';
  } catch {
    return false;
  }
}

/**
 * Accessible figure for a Blender render. The disclaimer is always rendered:
 * a render is never presented as a historical photograph.
 */
export function artFigureHtml(record: ArtManifestRecord, sizes = '(max-width: 760px) 100vw, 680px'): string {
  const srcset = artAssetSrcset(record);
  const draft = record.reviewed ? '' : ` · <span class="ed-art-draft">${escapeHtml(artReviewLabel(record))}</span>`;
  const caption = `${record.caption} · ${record.disclaimer}`;
  return `<figure class="ed-art"><img src="${escapeHtml(artAssetUrl(record))}"${
    srcset ? ` srcset="${escapeHtml(srcset)}" sizes="${escapeHtml(sizes)}"` : ''
  } alt="${escapeHtml(record.alt)}" loading="lazy" decoding="async"><figcaption>${escapeHtml(
    caption,
  )}${draft}</figcaption></figure>`;
}
