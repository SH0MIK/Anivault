// Ports the body markup of pages/player.php (senshi-player-root element),
// v5 (native <video controls>, subtitle-bug fix). prevEpNum/nextEpNum/
// epNums/watchBase are computed the same way the PHP did and passed in.
import { h } from '../lib/helpers';

export interface PlayerBodyParams {
  title: string;
  epNum: number;
  currentEpTitle: string | null;
  prevEpNum: number | null;
  nextEpNum: number | null;
  watchBase: string;
  epNums: number[];
  curEp: number;
  totalEpsN: number;
  episodesWatched?: number;
}

function renderEpGrid(epNums: number[], curEp: number, watchBase: string, totalEpsN: number, episodesWatched: number): string {
  if (epNums.length === 0) return '';
  const visibleCount = 24;
  const hasMore = epNums.length > visibleCount;
  let out = `<div class="sp-ep-divider"><span>All Episodes${totalEpsN > 0 ? ' · ' + totalEpsN + ' eps' : ''}</span></div>`;
  out += '<div class="sp-ep-grid" id="sp-ep-grid">';
  epNums.forEach((n, i) => {
    const isWatched = episodesWatched > 0 && n <= episodesWatched;
    const cls = 'sp-ep-chip' + (n === curEp ? ' current' : '') + (isWatched ? ' watched' : '') + (i >= visibleCount ? ' sp-ep-extra' : '');
    out += `<a class="${cls}" href="${h(watchBase + n)}">${n}</a>`;
  });
  out += '</div>';
  if (hasMore) {
    const extra = epNums.length - visibleCount;
    out += `<button class="sp-ep-more" id="sp-ep-more-btn" type="button" data-more-count="${extra}"><span id="sp-ep-more-label">Show More (${extra})</span><svg viewBox="0 0 24 24"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg></button>`;
  }
  return out;
}

export function playerBody(p: PlayerBodyParams): string {
  const { title, epNum, currentEpTitle, prevEpNum, nextEpNum, watchBase, epNums, curEp, totalEpsN, episodesWatched } = p;
  const epGridHtml = renderEpGrid(epNums, curEp, watchBase, totalEpsN, episodesWatched ?? 0);
  return `<div id="senshi-player-root">

  <!-- Top bar -->
  <div id="sp-topbar">
    <div>
      <div class="sp-top-title">${h(title)}</div>
      <div class="sp-top-ep">Episode ${epNum}${currentEpTitle && currentEpTitle !== 'TBA' ? ' — ' + h(currentEpTitle) : ''}</div>
    </div>
    <span id="sp-hls-badge">HLS</span>
  </div>

  <div id="sp-video-area">

    <!-- Video element: native controls give play/pause/seek/volume/fullscreen,
         and — once <track> subtitle elements are added below — the browser's
         own CC/subtitle selector, same as subtitle-test-player.html -->
    <video id="sp-video" controls playsinline preload="metadata" crossorigin="anonymous"></video>

    <!-- Spinner -->
    <div id="sp-spinner"><div class="sp-spin"></div></div>

    <!-- Error -->
    <div id="sp-error">
      <div class="sp-err-icon">⚠️</div>
      <div class="sp-err-title">Stream Unavailable</div>
      <p class="sp-err-msg" id="sp-err-msg">Could not load the stream.</p>
      <button class="sp-err-retry" onclick="SenshiPlayer.retry()">Try Again</button>
    </div>

  </div><!-- /#sp-video-area -->

  <!-- Single floating tooltip for info strip (JS-positioned, never clipped) -->
  <div id="sp-istat-float-tip"></div>

  <!-- ══ PANEL (below video) — UNCHANGED: Episodes / Quality / Speed / Stats / Keys ══ -->
  <div id="sp-panel">

    <!-- Info strip -->
    <div id="sp-info-strip">
      <div class="sp-istat" data-tip="Resolution">
        <svg viewBox="0 0 24 24"><path d="M1 5v14h22V5H1zm20 12H3V7h18v10zm-8-9h-2v2H9v2h2v2h2v-2h2v-2h-2z"/></svg>
        <span class="sp-istat-val" id="sp-i-res">—</span>
      </div>
      <div class="sp-istat-sep"></div>
      <div class="sp-istat" data-tip="Bitrate">
        <svg viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4 2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
        <span class="sp-istat-val" id="sp-i-br">—</span>
      </div>
      <div class="sp-istat-sep"></div>
      <div class="sp-istat" data-tip="Buffer">
        <svg viewBox="0 0 24 24"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61-1.42-1.42c-1.75-1.75-4.65-1.75-6.4 0L9.79 7.39C11.38 5.8 13.56 5 15.73 5s4.35.8 5.94 2.39L21.03 7.39zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7zm0-16C6.48 4 2 8.48 2 14s4.48 10 10 10 10-4.48 10-10S17.52 4 12 4z"/></svg>
        <span class="sp-istat-val" id="sp-i-buf">—</span>
      </div>
      <div class="sp-istat-sep"></div>
      <div class="sp-istat" data-tip="Codec">
        <svg viewBox="0 0 24 24"><path d="M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
        <span class="sp-istat-val" id="sp-i-codec">—</span>
      </div>
      <div class="sp-istat-sep"></div>
      <div class="sp-istat" data-tip="Level">
        <svg viewBox="0 0 24 24"><path d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z"/></svg>
        <span class="sp-istat-val" id="sp-i-lvl">—</span>
      </div>
      <div class="sp-istat-sep"></div>
      <div class="sp-istat" data-tip="Dropped Frames">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <span class="sp-istat-val" id="sp-i-drop">0</span>
      </div>
    </div>

    <!-- Tabs -->
    <div id="sp-panel-tabs">
      <button class="sp-ptab active" data-ptab="eps">Episodes</button>
      <button class="sp-ptab" data-ptab="quality">Quality</button>
      <button class="sp-ptab" data-ptab="speed">Speed</button>
      <button class="sp-ptab" data-ptab="stats">Stats</button>
      <button class="sp-ptab" data-ptab="keys">Keys</button>
    </div>
    <div id="sp-panel-body">

      <!-- Episodes -->
      <div class="sp-psec active" id="sp-ptab-eps">
        
        <div class="sp-ep-nav">
          <a class="sp-ep-nav-btn${prevEpNum === null ? ' disabled' : ''}"
             href="${prevEpNum !== null ? h(watchBase + prevEpNum) : '#'}">
            <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            <div class="sp-ep-nav-lbl">
              <small>Previous</small>
              ${prevEpNum !== null ? 'Ep ' + prevEpNum : 'None'}
            </div>
          </a>
          <a class="sp-ep-nav-btn next${nextEpNum === null ? ' disabled' : ''}"
             href="${nextEpNum !== null ? h(watchBase + nextEpNum) : '#'}">
            <div class="sp-ep-nav-lbl">
              <small>Next</small>
              ${nextEpNum !== null ? 'Ep ' + nextEpNum : 'None'}
            </div>
            <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2.5-6 8.5 6V6z"/></svg>
          </a>
        </div>
${epGridHtml}
      </div>

      <!-- Quality -->
      <div class="sp-psec" id="sp-ptab-quality">
        <div class="sp-qual-grid" id="sp-panel-qual-list">
          <div class="sp-qopt active" data-level="-1"><div class="sp-qopt-lbl">Auto</div><div class="sp-qopt-sub">Adaptive</div></div>
        </div>
      </div>

      <!-- Speed -->
      <div class="sp-psec" id="sp-ptab-speed">
        <div class="sp-spd-grid">
          <div class="sp-sopt" data-spd="0.25">0.25×</div>
          <div class="sp-sopt" data-spd="0.5">0.5×</div>
          <div class="sp-sopt" data-spd="0.75">0.75×</div>
          <div class="sp-sopt active" data-spd="1">1×</div>
          <div class="sp-sopt" data-spd="1.25">1.25×</div>
          <div class="sp-sopt" data-spd="1.5">1.5×</div>
          <div class="sp-sopt" data-spd="1.75">1.75×</div>
          <div class="sp-sopt" data-spd="2">2×</div>
        </div>
      </div>

      <!-- Stats -->
      <div class="sp-psec" id="sp-ptab-stats">
        <div class="sp-stat-bar">
          <div class="sp-stat-item">Segments <span id="sp-s-segs">0</span></div>
          <div class="sp-stat-item">Protocol <span>HLS</span></div>
          <div class="sp-stat-item">Network <span id="sp-s-net">—</span></div>
        </div>
        <div style="font-family:'Orbitron',monospace;font-size:.44rem;letter-spacing:.18em;color:var(--sp-text-muted);text-transform:uppercase;margin-bottom:6px">Buffer Health</div>
        <div id="sp-buf-chart"></div>
      </div>

      <!-- Keys -->
      <div class="sp-psec" id="sp-ptab-keys">
        <div class="sp-keys-grid">
          <div class="sp-key-row"><span class="sp-kbd">Space</span><span class="sp-key-desc">Play / Pause</span></div>
          <div class="sp-key-row"><span class="sp-kbd">← →</span><span class="sp-key-desc">Seek (native)</span></div>
          <div class="sp-key-row"><span class="sp-kbd">↑ ↓</span><span class="sp-key-desc">Volume (native)</span></div>
          <div class="sp-key-row"><span class="sp-kbd">M</span><span class="sp-key-desc">Mute toggle</span></div>
          <div class="sp-key-row"><span class="sp-kbd">F</span><span class="sp-key-desc">Fullscreen</span></div>
          <div class="sp-key-row"><span class="sp-kbd">CC</span><span class="sp-key-desc">Subtitle selector (native)</span></div>
        </div>
      </div>

    </div>
  </div>

</div><!-- /#senshi-player-root -->

<!-- HLS.js -->
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js"></script>

`;
}
