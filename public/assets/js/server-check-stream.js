/**
 * server-check-stream.js
 *
 * Drop-in replacement for the old "call server_check.php, wait for all,
 * then show buttons" pattern.
 *
 * How it works:
 *  1. Opens an SSE connection to api/server_check_stream.php
 *  2. Each time a server reports back (available OR unavailable), it:
 *       - If available: adds the server button to the UI immediately
 *       - If this is the FIRST available server: auto-loads the stream
 *         right away (user starts watching while the loader still spins)
 *  3. When "done" fires, the spinner is hidden and any unavailable servers
 *     are quietly skipped (no button shown).
 *
 * ── How to integrate ────────────────────────────────────────────────────
 *
 * 1. Add this script to your watch page (or paste inline).
 *
 * 2. Call startProgressiveServerCheck() after the page knows the episode:
 *
 *      startProgressiveServerCheck({
 *        mal:      16498,          // MAL anime ID
 *        anilist:  20665,          // AniList anime ID
 *        ep:       1,              // episode number
 *        audio:    'sub',          // 'sub' | 'dub'
 *
 *        // CSS selectors — adjust to match your existing HTML
 *        serverListEl:  '#server-list',    // <div> that holds server buttons
 *        loaderEl:      '#server-loader',  // spinner shown while searching
 *        noServerEl:    '#no-server-msg',  // "no servers found" message element
 *
 *        // Called when the first (or any) server button is clicked / auto-selected.
 *        // `serverName` is 'volt' | 'warp' | 'ayame'
 *        // Return a Promise that resolves when the player is ready (or void).
 *        onServerSelected: (serverName, isAutoPlay) => {
 *          loadServerInPlayer(serverName);
 *        },
 *      });
 *
 * 3. Remove / comment out your old fetch to api/server_check.php.
 */

function startProgressiveServerCheck(opts) {
  const {
    mal,
    anilist,
    ep,
    audio = 'sub',
    serverListEl  = '#server-list',
    loaderEl      = '#server-loader',
    noServerEl    = '#no-server-msg',
    onServerSelected,
  } = opts;

  const serverList = document.querySelector(serverListEl);
  const loader     = document.querySelector(loaderEl);
  const noServer   = document.querySelector(noServerEl);

  // Pretty display names for each internal server key
  const SERVER_LABELS = {
    volt:  'Senshi',   // matches your existing naming convention
    warp:  'Warp',
    ayame: 'Ayame',
  };

  // Track state
  let firstServerFound = false;
  let availableCount   = 0;

  // Show the spinner, hide the "no servers" message
  if (loader)   loader.style.display   = '';
  if (noServer) noServer.style.display = 'none';
  if (serverList) serverList.innerHTML = ''; // clear stale buttons from prev ep

  // ── Open SSE connection ─────────────────────────────────────────────────
  const url = `api/server_check_stream.php?mal=${mal}&anilist=${anilist}&ep=${ep}`;
  const es  = new EventSource(url);

  es.addEventListener('server', (e) => {
    const { name, available } = JSON.parse(e.data);

    if (!available) return; // skip — don't show a broken button

    availableCount++;
    const isFirst = !firstServerFound;
    if (isFirst) firstServerFound = true;

    // ── Add button ──────────────────────────────────────────────────────
    const btn = document.createElement('button');
    btn.className    = 'server-btn' + (isFirst ? ' server-btn--active' : '');
    btn.dataset.server = name;
    btn.textContent  = SERVER_LABELS[name] ?? name;

    btn.addEventListener('click', () => {
      // Deactivate siblings
      serverList?.querySelectorAll('.server-btn').forEach(b => b.classList.remove('server-btn--active'));
      btn.classList.add('server-btn--active');
      onServerSelected?.(name, false);
    });

    serverList?.appendChild(btn);

    // ── Auto-play the first server found — don't wait for the others ───
    if (isFirst) {
      onServerSelected?.(name, true);
    }
  });

  es.addEventListener('done', () => {
    es.close();

    // Hide spinner — we're done searching
    if (loader) loader.style.display = 'none';

    // If nothing worked, show the "no servers" notice
    if (availableCount === 0 && noServer) {
      noServer.style.display = '';
    }
  });

  es.addEventListener('error', () => {
    es.close();
    if (loader) loader.style.display = 'none';
    console.warn('[ServerCheck] SSE connection failed or closed.');
    // Optionally fall back to the old endpoint here
  });

  // Return the EventSource so the caller can close it early (e.g. on ep change)
  return es;
}


// ── Example integration (replace with your actual player code) ───────────
//
// let activeEs = null;
//
// function loadEpisode(mal, anilist, ep, audio) {
//   // Close any in-progress check from the previous episode
//   if (activeEs) activeEs.close();
//
//   activeEs = startProgressiveServerCheck({
//     mal, anilist, ep, audio,
//     serverListEl:  '#server-list',
//     loaderEl:      '#server-loader',
//     noServerEl:    '#no-server-msg',
//     onServerSelected(serverName, isAutoPlay) {
//       if (serverName === 'volt') {
//         // Fetch Senshi HLS and hand to your HLS.js player
//         fetch(`api/senshi_stream.php?anime=${mal}&ep=${ep}&audio=${audio}`)
//           .then(r => r.json())
//           .then(d => d.m3u8 && playHls(d.m3u8));
//       } else if (serverName === 'warp') {
//         showIframe(`https://tryembed.us.cc/embed/anime/${anilist}/${ep}/${audio}`);
//       } else if (serverName === 'ayame') {
//         showIframe(`https://vidnest.fun/animepahe/${anilist}/${ep}/${audio}`);
//       }
//     },
//   });
// }
