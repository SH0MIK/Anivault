export function watchScript1(params: {
  anilistId: number | null; epNum: number; resumeParam: number; animeId: number;
  siteUrl: string; qSub: any[]; qDub: any[]; isLoggedIn: boolean;
}): string {
  const { anilistId, epNum, resumeParam, animeId, siteUrl, qSub, qDub, isLoggedIn } = params;
  return `<script>
const anilistId = ${JSON.stringify(anilistId)};
const epNum = ${epNum};
const resumeTime = ${resumeParam};
let currentServer = 'animeheaven';
let currentAudio  = 'sub';

// PHP-injected Senshi stream data now lives in player.php

function buildMegaplayUrl(audio) {
    let url = \`https://megaplay.buzz/stream/mal/${animeId}/${epNum}/\${audio}\`;
    if (resumeTime) url += \`?t=\${resumeTime}\`;
    return url;
}

function buildBackupUrl(server, audio) {
    switch (server) {
        case 'volt':  return null; // handled separately via Senshi HLS player
        default: return null;
    }
}

function updateActiveServerButton(serverName, audio) {
    document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
    // Only activate buttons inside the matching tab panel
    const panel = document.getElementById('tab-panel-' + audio);
    if (!panel) return;
    const btn = panel.querySelector(\`.server-btn[data-server="\${serverName}"]\`);
    if (btn) btn.classList.add('active');
}

(function initAdGuard(){
    const _orig = window.open.bind(window);
    window.open = function(url, name, specs){
        if (!url) return null;
        try {
            const h = new URL(url, location.href).hostname;
            if (h === location.hostname) return _orig(url, name, specs);
        } catch(e){}
        const dummy = { closed:false, close(){this.closed=true;}, focus(){}, location:{href:'about:blank'} };
        return dummy;
    };
})();

function attachRyuShield(pw) {
    const sh = document.getElementById('mp-click-shield');
    if (sh) sh.remove();
    if (window.__attachRyuShield) window.__attachRyuShield(pw);
}
function removeRyuShield() {
    const sh = document.getElementById('mp-click-shield');
    if (sh) { sh.style.transition='opacity .15s'; sh.style.opacity='0'; setTimeout(()=>sh.remove(),150); }
}

let _uShieldTimer = null;

// ── AnimeHeaven (MP4 via fetch, plays in the custom player) ──────────────
function switchToAnimeHeaven(audio) {
    const pw = document.getElementById('watch-player-wrap');
    if (!pw) return;

    // Detach player node first so innerHTML='' doesn't destroy it
    const sp = document.getElementById('senshi-player-root');
    if (sp && sp.parentNode) sp.parentNode.removeChild(sp);

    pw.style.opacity = '0';
    removeRyuShield();
    const oldShield = document.getElementById('universal-click-shield');
    if (oldShield) { clearTimeout(_uShieldTimer); oldShield.remove(); }
    if (pw._senshiHls) { pw._senshiHls.destroy(); pw._senshiHls = null; }

    // Restore shell to player mode
    pw.style.aspectRatio  = 'unset';
    pw.style.overflow     = 'visible';
    pw.style.background   = 'transparent';
    pw.style.borderRadius = '14px';
    pw.innerHTML = '';

    // Show a loading state in the player
    if (sp) {
        sp.style.cssText = 'display:block;width:100%;';
        pw.appendChild(sp);
    }
    pw.style.opacity = '1';

    // Show spinner in player while fetching
    if (window.SenshiPlayer) {
        // Signal player to show loading spinner
        const spinEl = document.getElementById('sp-spinner');
        if (spinEl) spinEl.classList.add('show');
        const errEl = document.getElementById('sp-error');
        if (errEl) errEl.classList.remove('show');
        const preplay = document.getElementById('sp-preplay');
        if (preplay) preplay.classList.add('hide');
    }

    // Fetch MP4 URL
    fetch(\`${siteUrl}/api/animeheaven_stream.php?anime=${animeId}&ep=${epNum}&audio=\${audio}\`)
        .then(r => r.json())
        .then(d => {
            if (d.error || !d.mp4) {
                if (window.SenshiPlayer) {
                    const errMsg = document.getElementById('sp-err-msg');
                    if (errMsg) errMsg.textContent = d.error ? \`AnimeHeaven: \${d.error}\` : 'No stream URL returned.';
                    const errEl = document.getElementById('sp-error');
                    if (errEl) errEl.classList.add('show');
                    const spinEl = document.getElementById('sp-spinner');
                    if (spinEl) spinEl.classList.remove('show');
                }
                return;
            }
            // Load MP4 directly into the custom player's video element
            const vid = document.getElementById('sp-video');
            if (vid) {
                vid.src = d.mp4;
                vid.load();
                vid.play().catch(() => {});
            }
            const spinEl = document.getElementById('sp-spinner');
            if (spinEl) spinEl.classList.remove('show');
            // Hide HLS badge since this is MP4
            const badge = document.getElementById('sp-hls-badge');
            if (badge) badge.textContent = 'MP4';
        })
        .catch(() => {
            const errMsg = document.getElementById('sp-err-msg');
            if (errMsg) errMsg.textContent = 'Could not reach stream server.';
            const errEl = document.getElementById('sp-error');
            if (errEl) errEl.classList.add('show');
            const spinEl = document.getElementById('sp-spinner');
            if (spinEl) spinEl.classList.remove('show');
        });
}

// ── Miruro (HLS via fetch for a specific provider) ───────────────────────
function switchToMiruro(providerName, audio) {
    const pw = document.getElementById('watch-player-wrap');
    if (!pw) return;

    // Detach player node first so innerHTML='' doesn't destroy it
    const sp = document.getElementById('senshi-player-root');
    if (sp && sp.parentNode) sp.parentNode.removeChild(sp);

    pw.style.opacity = '0';
    removeRyuShield();
    const oldShield = document.getElementById('universal-click-shield');
    if (oldShield) { clearTimeout(_uShieldTimer); oldShield.remove(); }

    // Restore to player mode
    pw.style.aspectRatio  = 'unset';
    pw.style.overflow     = 'visible';
    pw.style.background   = 'transparent';
    pw.style.borderRadius = '14px';
    pw.innerHTML = '';

    if (sp) {
        sp.style.cssText = 'display:block;width:100%;';
        pw.appendChild(sp);
    }
    pw.style.opacity = '1';

    // Show spinner
    if (window.SenshiPlayer) window.SenshiPlayer.destroy();
    const spinEl = document.getElementById('sp-spinner');
    if (spinEl) spinEl.classList.add('show');
    const errEl = document.getElementById('sp-error');
    if (errEl) errEl.classList.remove('show');
    const preplay = document.getElementById('sp-preplay');
    if (preplay) preplay.classList.add('hide');
    const badge = document.getElementById('sp-hls-badge');
    if (badge) badge.textContent = 'HLS';

    // Fetch HLS URL
    fetch(\`${siteUrl}/api/miruro_stream.php?anime=${animeId}&ep=${epNum}&audio=\${audio}&server=\${encodeURIComponent(providerName)}\`)
        .then(r => r.json())
        .then(d => {
            if (d.error || !d.m3u8) {
                const errMsg = document.getElementById('sp-err-msg');
                if (errMsg) errMsg.textContent = d.error ? \`Miruro (\${providerName}): \${d.error}\` : 'No stream URL returned.';
                if (errEl) errEl.classList.add('show');
                if (spinEl) spinEl.classList.remove('show');
                return;
            }
            if (window.SenshiPlayer) window.SenshiPlayer.load(d.m3u8);
            else {
                // Fallback: load directly
                const vid = document.getElementById('sp-video');
                if (vid) { vid.src = d.m3u8; vid.load(); vid.play().catch(()=>{}); }
            }
        })
        .catch(() => {
            const errMsg = document.getElementById('sp-err-msg');
            if (errMsg) errMsg.textContent = 'Could not reach stream server.';
            if (errEl) errEl.classList.add('show');
            if (spinEl) spinEl.classList.remove('show');
        });
}

function switchToServer(serverName, audio = currentAudio) {
    const pw = document.getElementById('watch-player-wrap');
    if (!pw) return;

    // ── AnimeHeaven (MP4) ────────────────────────────────────────────────
    if (serverName === 'animeheaven') {
        switchToAnimeHeaven(audio);
        currentServer = serverName;
        currentAudio  = audio;
        updateActiveServerButton(serverName, audio);
        return;
    }

    // ── Miruro providers (HLS) ───────────────────────────────────────────
    if (serverName.startsWith('miruro-')) {
        const providerName = serverName.slice('miruro-'.length); // e.g. "bonk"
        switchToMiruro(providerName, audio);
        currentServer = serverName;
        currentAudio  = audio;
        updateActiveServerButton(serverName, audio);
        return;
    }

    // ── Senshi server (volt slot) — standalone player ────────────────────
    if (serverName === 'volt') {
        // Detach first so innerHTML='' doesn't destroy sp
        const sp = document.getElementById('senshi-player-root');
        if (sp && sp.parentNode) sp.parentNode.removeChild(sp);

        pw.style.opacity = '0';
        removeRyuShield();
        const oldShield = document.getElementById('universal-click-shield');
        if (oldShield) { clearTimeout(_uShieldTimer); oldShield.remove(); }
        if (pw._senshiHls) { pw._senshiHls.destroy(); pw._senshiHls = null; }
        setTimeout(() => {
            pw.innerHTML = '';
            pw.style.aspectRatio  = 'unset';
            pw.style.overflow     = 'visible';
            pw.style.background   = 'transparent';
            pw.style.borderRadius = '14px';
            if (sp) {
                sp.style.cssText = 'display:block;width:100%;';
                pw.appendChild(sp);
            }
            pw.style.opacity = '1';
            currentServer = serverName;
            currentAudio  = audio;
            updateActiveServerButton(serverName, audio);

            // Actually (re)load the stream for the requested audio track.
            // Without this, switching to/within Senshi only moved DOM nodes
            // around and never fetched anything — so it either showed nothing
            // (if previously destroyed) or kept playing whatever audio track
            // was already loaded (sub showing under the Dub tab, etc).
            if (window.SenshiPlayer && window.SenshiPlayer.switchAudio) {
                window.SenshiPlayer.switchAudio(audio);
            } else if (window.SenshiPlayer) {
                window.SenshiPlayer.retry();
            }
        }, 200);
        return;
    }
}

// Gate buttons — sign in / join popup
['wg-play','wg-play2'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function() { requireLogin('login'); });
});
['wg-signin','wg-signin2'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function() { requireLogin('login'); });
});
['wg-signup','wg-signup2'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function() { requireLogin('signup'); });
});

// ── Tab switching ─────────────────────────────────────────────────────────
document.querySelectorAll('.server-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.server-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.server-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-panel-' + tab.dataset.tab)?.classList.add('active');
    });
});

// ── Server button clicks ──────────────────────────────────────────────────
document.querySelectorAll('.server-tab-panel').forEach(panel => {
    panel.addEventListener('click', e => {
        const btn = e.target.closest('.server-btn');
        if (!btn) return;
        const serverName = btn.dataset.server;
        const audio = panel.dataset.audio;
        switchToServer(serverName, audio);
    });
});

// ── Probe every server live and only show ones that actually work ───────
// Hits the real stream endpoints for this anime/episode (not just a
// provider listing) so broken/404 servers never show up as clickable.
(function probeAndRenderServers() {
    // The server tab panels only exist for logged-in users with a video
    // (see the Auth::check() && ($video || $megaplayEmbed) guard above).
    // For everyone else #watch-player-wrap holds the sign-in gate — don't
    // touch it, and don't bother hitting the (auth-gated) stream endpoints.
    if (!document.getElementById('tab-panel-sub') && !document.getElementById('tab-panel-dub')) return;

    const SITE  = '${siteUrl}';
    const ANIME = ${animeId};
    const EP    = <?= (int)$epNum ?>;

    function makeBtn(serverKey, label, badge) {
        const btn = document.createElement('button');
        btn.className = 'server-btn';
        btn.dataset.server = serverKey;
        btn.innerHTML = badge ? \`\${label} <span class="ad-badge">\${badge}</span>\` : label;
        return btn;
    }

    function checkAnimeHeaven(audio) {
        return fetch(\`\${SITE}/api/animeheaven_stream.php?anime=\${ANIME}&ep=\${EP}&audio=\${audio}\`)
            .then(r => r.json()).then(d => !d.error && !!d.mp4).catch(() => false);
    }
    function checkSenshi(audio) {
        return fetch(\`\${SITE}/api/senshi_stream.php?anime=\${ANIME}&ep=\${EP}&audio=\${audio}\`)
            .then(r => r.json()).then(d => !d.error && !!d.m3u8).catch(() => false);
    }
    // Railway can cold-start or hiccup; retry the Miruro provider list a
    // couple of times with backoff before concluding there's nothing there.
    function fetchMiruroList(audio, attempt = 1) {
        return fetch(\`\${SITE}/api/miruro_stream.php?anime=\${ANIME}&ep=\${EP}&audio=\${audio}\`)
            .then(r => r.json())
            .then(d => (d.servers || []).filter(s => s.type === audio))
            .catch(() => [])
            .then(list => {
                if (list.length > 0 || attempt >= 3) return list;
                return new Promise(res => setTimeout(res, attempt * 1500))
                    .then(() => fetchMiruroList(audio, attempt + 1));
            });
    }
    // A provider being listed doesn't mean it actually resolves — confirm
    // each one really returns a stream before showing its button.
    function checkMiruroProvider(provider, audio) {
        return fetch(\`\${SITE}/api/miruro_stream.php?anime=\${ANIME}&ep=\${EP}&audio=\${audio}&server=\${encodeURIComponent(provider)}\`)
            .then(r => r.json()).then(d => !d.error && !!d.m3u8).catch(() => false);
    }

    // ── Incremental probing ───────────────────────────────────────────────
    // Every server check below runs independently (no Promise.all gate).
    // The instant ANY server for the active "sub" tab is confirmed, its
    // button is rendered AND playback starts immediately — everything else
    // keeps probing in the background and just slots its button in next to
    // it whenever it finishes. If sub comes up completely empty, we fall
    // back to whatever's already working (or shows up next) on dub.
    let playbackStarted = false;
    let subPending = 0, dubPending = 0;
    let subHasAny  = false, dubHasAny  = false;

    function setSearching(audio, stillSearching) {
        const loading = document.getElementById('servers-' + audio + '-loading');
        if (!loading) return;
        if (stillSearching) {
            // Collapse the 3-bar skeleton down to a single "still looking"
            // pill once real buttons are already showing next to it.
            loading.innerHTML = '<span class="server-skel"><span class="server-skel-dot"></span><span class="server-skel-bar" style="width:80px"></span></span>';
        } else {
            const hasAny = audio === 'sub' ? subHasAny : dubHasAny;
            if (hasAny) loading.remove();
            else { loading.className = 'miruro-loading'; loading.textContent = 'No working servers found'; }
        }
    }

    function activateButton(audio, key) {
        playbackStarted = true;
        document.querySelectorAll('.server-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === audio));
        document.querySelectorAll('.server-tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-panel-' + audio));
        const btn = document.querySelector(\`#tab-panel-\${audio} .server-btn[data-server="\${key}"]\`);
        if (btn) btn.classList.add('active');
        switchToServer(key, audio);
    }

    function showNoServersAtAll() {
        const pw = document.getElementById('watch-player-wrap');
        if (pw) pw.innerHTML = \`<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:240px;color:var(--text-muted);font-family:var(--font-body);text-align:center;padding:1rem;">No working servers found for this episode.</div>\`;
    }

    function markServerFound(audio, key, label, badge) {
        const panel   = document.getElementById('tab-panel-' + audio);
        const loading = document.getElementById('servers-' + audio + '-loading');
        if (!panel || panel.querySelector(\`.server-btn[data-server="\${key}"]\`)) return;

        const btn = makeBtn(key, label, badge);
        if (loading) panel.insertBefore(btn, loading); else panel.appendChild(btn);

        if (audio === 'sub') {
            subHasAny = true;
            if (!playbackStarted) activateButton('sub', key);
        } else {
            dubHasAny = true;
            // Sub already came up empty by the time this dub result landed
            // (or never had a chance) — play this one instead of waiting.
            if (!playbackStarted && subPending === 0 && !subHasAny) activateButton('dub', key);
        }
    }

    function subTaskDone() {
        subPending--;
        if (subPending === 0) {
            setSearching('sub', false);
            // Sub fully exhausted with nothing working — fall back to a
            // dub server that's already been found, if any.
            if (!playbackStarted && !subHasAny && dubHasAny) {
                const firstBtn = document.querySelector('#tab-panel-dub .server-btn');
                if (firstBtn) activateButton('dub', firstBtn.dataset.server);
            }
            if (dubPending === 0 && !subHasAny && !dubHasAny && !playbackStarted) showNoServersAtAll();
        } else if (subHasAny) {
            setSearching('sub', true);
        }
    }
    function dubTaskDone() {
        dubPending--;
        if (dubPending === 0) {
            setSearching('dub', false);
            if (subPending === 0 && !subHasAny && !dubHasAny && !playbackStarted) showNoServersAtAll();
        } else if (dubHasAny) {
            setSearching('dub', true);
        }
    }

    // AnimeHeaven(sub) + Senshi(sub) + Miruro-list(sub) = 3 sub tasks.
    // Senshi(dub) + Miruro-list(dub) = 2 dub tasks. AnimeHeaven is sub-only
    // (api/animeheaven_stream.php ignores the audio param), so it never
    // contributes a dub task.
    subPending = 3;
    dubPending = 2;

    // ── SERVER DISPLAY NAMES ─────────────────────────────────────────────────
    // Change any value here to rename that button on the watch page.
    const SERVER_NAMES = {
        animeheaven:  'Eden',
        senshi:       'Neon',
        kiwi:         'Jade',
        bonk:         'Bash',
        bee:          'Hex',
        bun:          'Puff',
        twin:         'Echo',
        ally:         'Pact',
        moo:          'Haze',
        cog:          'Gear',
        pewe:         'Wren',
        nun:          'Veil',
        telli:        'Flux',
        hop:          'Dart',
        animedunya:   'Dune',
    };

    checkAnimeHeaven('sub').then(ok => { if (ok) markServerFound('sub', 'animeheaven', SERVER_NAMES.animeheaven); subTaskDone(); });
    checkSenshi('sub').then(ok => { if (ok) markServerFound('sub', 'volt', SERVER_NAMES.senshi); subTaskDone(); });
    checkSenshi('dub').then(ok => { if (ok) markServerFound('dub', 'volt', SERVER_NAMES.senshi); dubTaskDone(); });

    fetchMiruroList('sub').then(list => {
        // Add the per-provider tasks BEFORE closing out the list-fetch task
        // itself, so subPending never momentarily drops to 0 while these
        // provider checks are still in flight.
        list.map(s => s.name).forEach(p => {
            const pKey = p.toLowerCase().trim();
            subPending++;
            checkMiruroProvider(p, 'sub').then(ok => {
                if (ok) markServerFound('sub', \`miruro-\${pKey}\`, SERVER_NAMES[pKey] ?? pKey.charAt(0).toUpperCase() + pKey.slice(1));
                subTaskDone();
            });
        });
        subTaskDone();
    });

    fetchMiruroList('dub').then(list => {
        list.map(s => s.name).forEach(p => {
            const pKey = p.toLowerCase().trim();
            dubPending++;
            checkMiruroProvider(p, 'dub').then(ok => {
                if (ok) markServerFound('dub', \`miruro-\${pKey}\`, SERVER_NAMES[pKey] ?? pKey.charAt(0).toUpperCase() + pKey.slice(1));
                dubTaskDone();
            });
        });
        dubTaskDone();
    });
})();

var _ws={sub:${JSON.stringify(qSub)},dub:${JSON.stringify(qDub)}};
var _wa='sub';
function switchWatchQuality(b,i){
    document.querySelectorAll('.wpc-q').forEach(function(x){x.classList.remove('on');});
    b.classList.add('on');
    var s=_ws[_wa]||[];
    var w=document.getElementById('watch-player-wrap');
    w.style.opacity='0';
    setTimeout(function(){
        w.innerHTML=s[i]?s[i].embed:'';
        w.style.opacity='1';
        var f=w.querySelector('iframe');
        if(f&&!f.id)f.id='main-player-iframe';
    },200);
}

function filterEps(q){
  var rows=document.querySelectorAll('.ep-item');
  var s=q.toLowerCase().trim();
  rows.forEach(function(r){r.style.display=(!s||( r.getAttribute('data-s')||'').includes(s))?'':'none';});
}

(function(){
  var animeId=${animeId};
  function applyThumb(n,url){
    var w=document.querySelector('.ep-thumb-box[data-ep="'+n+'"]');
    if(!w)return;
    var img=w.querySelector('.ep-thumb-img');
    if(!img)return;
    var t=new Image();t.onload=function(){img.src=url;img.classList.add('vis');};t.src=url;
  }
  async function loadThumbs(){
    try{
      var r=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'query ($malId: Int) { Media(idMal: $malId, type: ANIME) { streamingEpisodes { title thumbnail site } } }',variables:{malId:animeId}})});
      var data=await r.json();
      var eps=(data&&data.data&&data.data.Media&&data.data.Media.streamingEpisodes)||[];
      ${isLoggedIn ? 'var cur=null;' : ''}
      eps.forEach(function(ep){var m=(ep.title||'').match(/Episode\\s+(\\d+)/i);if(!m||!ep.thumbnail)return;var n=parseInt(m[1]);applyThumb(n,ep.thumbnail);${isLoggedIn ? `if(n===${epNum})cur=ep.thumbnail;` : ''}});
      <?php if(Auth::check()):?>if(cur)fetch('${siteUrl}/api/watch_history.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'set_ep_info',anime_id:<?=$animeId?>,episode_num:<?=$epNum?>,ep_thumb:cur})}).catch(function(){});<?php endif;?>
    }catch(e){}
    try{var ov=await fetch('/api/episode_override.php?anime_id='+animeId+'&all=1');if(ov.ok){var od=await ov.json();(od.overrides||[]).forEach(function(o){if(o.image_url)applyThumb(o.episode_num,o.image_url);});}}catch(e){}
  }
  setTimeout(loadThumbs,300);
})();

</script>
`;
}
