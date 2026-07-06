// Ports includes/anime_card.php. Takes a normalised anime object plus the
// viewer's list-status map (so "Add to List" vs "Edit in List" matches).
import { h } from './helpers';
import { icon } from './icons';
import { NormalisedAnime } from './mal-api';

const STATUS_LABELS: Record<string, string> = { watching: 'Watching', completed: 'Completed', plan_to_watch: 'Planning', dropped: 'Dropped', on_hold: 'On Hold' };
const STATUS_CLASSES: Record<string, string> = { watching: 'badge-watching', completed: 'badge-completed', plan_to_watch: 'badge-ptw', dropped: 'badge-dropped', on_hold: 'badge-onhold' };

export function renderAnimeCard(a: NormalisedAnime, siteUrl: string, userStatus: string | null): string {
  const aid = a.mal_id ?? 0;
  const atitle = a.title_english && a.title_english !== a.title ? a.title_english : (a.title || 'Unknown');
  const aimg = a.images?.jpg?.image_url ?? '';
  const ascore = a.score;
  const atype = a.type ?? '';
  const aeps = a.episodes ?? 0;
  const aurl = `${siteUrl}/pages/anime.php?id=${aid}`;

  const jTitle = JSON.stringify(atitle);
  const jImage = JSON.stringify(aimg);
  const inUserList = userStatus !== null;

  return `
<div class="anime-card" onclick="window.location.href='${h(aurl)}'">
  <div class="anime-card-poster">
    ${aimg
      ? `<img src="${h(aimg)}" alt="${h(atitle)}" loading="lazy">`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:2rem;">${icon('user', 'icon-xl')}</div>`}
    ${ascore ? `<div class="anime-card-score">${icon('star', 'icon-small')} ${ascore.toFixed(1)}</div>` : ''}
    ${userStatus ? `<div class="anime-card-user-status badge ${STATUS_CLASSES[userStatus] ?? 'badge-default'}" data-anime-id="${aid}">${STATUS_LABELS[userStatus] ?? userStatus}</div>` : ''}
    <div class="anime-card-overlay">
      <button class="btn btn-primary btn-sm" onclick='event.stopPropagation(); addToList(${aid}, ${jTitle}, ${jImage}, ${Number(aeps)})'>
        ${inUserList ? '✏️ Edit in List' : `${icon('plus', 'icon-small')} Add to List`}
      </button>
    </div>
    <div class="anime-card-bottom-mobile">
      <button class="anime-card-add-mobile" onclick='event.stopPropagation(); addToList(${aid}, ${jTitle}, ${jImage}, ${Number(aeps)})' title="${inUserList ? 'Edit in List' : 'Add to List'}">
        ${inUserList ? icon('edit', 'icon-small') : '+'}
      </button>
      ${userStatus ? `<span class="anime-card-status-mobile badge ${STATUS_CLASSES[userStatus] ?? 'badge-default'}">${STATUS_LABELS[userStatus] ?? userStatus}</span>` : ''}
    </div>
  </div>
  <div class="anime-card-info">
    <div class="anime-card-title">${h(atitle)}</div>
    <div class="anime-card-meta">${h(atype)}${aeps ? ` · ${aeps} eps` : ''}</div>
  </div>
</div>`;
}
