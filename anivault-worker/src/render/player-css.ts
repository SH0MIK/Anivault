export const PLAYER_CSS = `<style id="sp-skin">
/* ─── Tokens ────────────────────────────────────────────── */
:root{
  --sp-accent:#e8453c;
  --sp-accent-rgb:232,69,60;
  --sp-accent-glow:rgba(232,69,60,0.4);
  --sp-bg:#05070d;
  --sp-surface:#0f1219;
  --sp-surface2:#161b26;
  --sp-surface3:#1e2535;
  --sp-text:#e8eaf0;
  --sp-text-sub:rgba(232,234,240,0.6);
  --sp-text-muted:rgba(232,234,240,0.35);
  --sp-border:rgba(232,69,60,0.15);
  --sp-border2:rgba(232,69,60,0.08);
  --sp-bar-track:rgba(255,255,255,0.1);
  --sp-bar-buf:rgba(255,255,255,0.2);
  --sp-grad-top:linear-gradient(to bottom,rgba(5,7,13,0.92) 0%,transparent 100%);
  --sp-grad-btm:linear-gradient(to top,rgba(5,7,13,0.97) 0%,rgba(5,7,13,0.55) 50%,transparent 100%);
  --sp-menu-bg:rgba(8,10,18,0.98);
  --sp-r:14px;
  --sp-hud:'Orbitron',monospace;
  --sp-body:'Exo 2',sans-serif;
  --sp-transition:0.25s cubic-bezier(0.16,1,0.3,1);
}

/* ─── Reset / base ──────────────────────────────────────── */
#senshi-player-root *{box-sizing:border-box;margin:0;padding:0}
#senshi-player-root{
  position:relative;width:100%;
  background:var(--sp-bg);
  font-family:var(--sp-body);
  -webkit-user-select:none;user-select:none;
  touch-action:manipulation;
  -webkit-tap-highlight-color:transparent;
  border-radius:var(--sp-r);
  box-shadow:0 0 0 1px var(--sp-border),0 0 28px rgba(232,69,60,0.07);
}



/* ─── Video area ────────────────────────────────────────── */
#sp-video-area{position:relative;width:100%;aspect-ratio:16/9;background:#000;cursor:default;border-radius:var(--sp-r) var(--sp-r) 0 0;overflow:hidden;touch-action:manipulation}
#sp-video{width:100%;height:100%;display:block;background:#000;pointer-events:none;object-fit:contain}

/* HUD corner brackets */
.sp-corner{position:absolute;width:20px;height:20px;pointer-events:none;z-index:4;}
.sp-corner.tl{top:0;left:0;border-top:1.5px solid rgba(232,69,60,0.5);border-left:1.5px solid rgba(232,69,60,0.5);border-radius:var(--sp-r) 0 0 0}
.sp-corner.tr{top:0;right:0;border-top:1.5px solid rgba(232,69,60,0.5);border-right:1.5px solid rgba(232,69,60,0.5);border-radius:0 var(--sp-r) 0 0}
.sp-corner.bl{bottom:0;left:0;border-bottom:1.5px solid rgba(232,69,60,0.5);border-left:1.5px solid rgba(232,69,60,0.5);border-radius:0 0 0 var(--sp-r)}
.sp-corner.br{bottom:0;right:0;border-bottom:1.5px solid rgba(232,69,60,0.5);border-right:1.5px solid rgba(232,69,60,0.5);border-radius:0 0 var(--sp-r) 0}

/* ─── Spinner ───────────────────────────────────────────── */
#sp-spinner{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:20;pointer-events:none;opacity:0;transition:opacity .25s}
#sp-spinner.show{opacity:1}
.sp-spin{width:46px;height:46px;border-radius:50%;border:2.5px solid transparent;border-top-color:var(--sp-accent);border-bottom-color:rgba(232,69,60,0.2);animation:sp-spin .75s linear infinite;box-shadow:0 0 12px var(--sp-accent-glow)}
@keyframes sp-spin{to{transform:rotate(360deg)}}

/* ─── Error ─────────────────────────────────────────────── */
#sp-error{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:.9rem;background:rgba(0,0,0,0.9);z-index:40;padding:2rem;text-align:center}
#sp-error.show{display:flex}
.sp-err-icon{font-size:2rem}
.sp-err-title{font-family:var(--sp-hud);font-size:.85rem;letter-spacing:.06em;color:#fff}
.sp-err-msg{font-size:.78rem;color:var(--sp-text-sub);line-height:1.5;max-width:320px}
.sp-err-retry{font-family:var(--sp-hud);font-size:.7rem;letter-spacing:.08em;padding:.4rem 1.4rem;background:var(--sp-accent);color:#fff;border:none;border-radius:8px;cursor:pointer;transition:opacity .15s}
.sp-err-retry:hover{opacity:.85}

/* ─── Pre-play overlay ──────────────────────────────────── */
#sp-preplay{position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity .35s}
#sp-preplay.hide{opacity:0;pointer-events:none}
#sp-pp-bg{position:absolute;inset:-6px;background-size:cover;background-position:center top;filter:brightness(.4) saturate(.8);transform:scale(1.04);transition:transform 6s ease}
#sp-preplay:hover #sp-pp-bg{transform:scale(1.07)}
#sp-pp-vignette{position:absolute;inset:0;background:radial-gradient(ellipse 70% 80% at 50% 50%,transparent 30%,rgba(0,0,0,0.55) 100%),linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 50%)}
#sp-pp-btn{position:relative;z-index:1;width:80px;height:80px;border-radius:50%;background:rgba(232,69,60,0.12);border:2px solid rgba(232,69,60,0.55);display:flex;align-items:center;justify-content:center;transition:all .22s;backdrop-filter:blur(8px);animation:pp-pulse 2.6s ease-in-out infinite}
@keyframes pp-pulse{0%,100%{box-shadow:0 0 0 0 rgba(232,69,60,.4)}50%{box-shadow:0 0 0 16px rgba(232,69,60,0)}}
#sp-preplay:hover #sp-pp-btn{background:var(--sp-accent);border-color:var(--sp-accent);animation:none;box-shadow:0 0 32px var(--sp-accent-glow)}
#sp-pp-btn svg{width:32px;height:32px;fill:#fff;margin-left:4px}

/* ─── Top bar ───────────────────────────────────────────── */
#sp-topbar{
  position:absolute;top:0;left:0;right:0;z-index:25;
  padding:12px 16px 36px;
  background:var(--sp-grad-top);
  display:flex;align-items:flex-start;justify-content:space-between;
  transition:opacity var(--sp-transition),transform var(--sp-transition);
}
#sp-topbar.hidden{opacity:0;pointer-events:none;transform:translateY(-5px)}
.sp-top-title{font-family:var(--sp-hud);font-size:.72rem;font-weight:500;letter-spacing:.06em;color:#fff;text-shadow:0 0 12px rgba(232,69,60,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60vw}
.sp-top-ep{font-family:var(--sp-hud);font-size:.58rem;letter-spacing:.08em;color:rgba(232,69,60,.65);margin-top:3px}
.sp-top-right{display:flex;align-items:center;gap:6px;flex-shrink:0}
#sp-hls-badge{font-family:var(--sp-hud);font-size:.5rem;letter-spacing:.14em;color:rgba(232,69,60,.7);border:1px solid rgba(232,69,60,.25);border-radius:4px;padding:2px 6px;background:rgba(232,69,60,.06)}

/* ─── Controls bar ──────────────────────────────────────── */
#sp-controls{
  position:absolute;bottom:0;left:0;right:0;z-index:25;
  padding:44px 16px 13px;
  background:var(--sp-grad-btm);
  transition:opacity var(--sp-transition),transform var(--sp-transition);
}
#sp-controls.hidden{opacity:0;pointer-events:none;transform:translateY(5px)}

/* ─── Progress ──────────────────────────────────────────── */
#sp-prog-area{position:relative;height:22px;display:flex;align-items:center;margin-bottom:7px;cursor:pointer}
#sp-prog-track{position:relative;flex:1;height:3px;border-radius:3px;background:var(--sp-bar-track);transition:height .14s;overflow:visible}
#sp-prog-area:hover #sp-prog-track{height:5px}
#sp-prog-buf{position:absolute;left:0;top:0;bottom:0;background:var(--sp-bar-buf);border-radius:inherit;width:0%;pointer-events:none}
#sp-prog-fill{position:absolute;left:0;top:0;bottom:0;background:var(--sp-accent);border-radius:inherit;width:0%;box-shadow:0 0 8px var(--sp-accent-glow);pointer-events:none}
#sp-prog-thumb{position:absolute;top:50%;left:0%;transform:translate(-50%,-50%);width:13px;height:13px;border-radius:50%;background:#fff;border:1.5px solid var(--sp-accent);box-shadow:0 0 10px var(--sp-accent-glow);opacity:0;pointer-events:none;transition:opacity .14s,transform .12s}
#sp-prog-area:hover #sp-prog-thumb{opacity:1}
#sp-prog-area:active #sp-prog-thumb{transform:translate(-50%,-50%) scale(1.35)}
#sp-prog-tip{position:absolute;bottom:22px;transform:translateX(-50%);background:rgba(0,0,0,.88);border:1px solid rgba(255,255,255,.1);color:#fff;font-family:var(--sp-hud);font-size:.62rem;padding:.15rem .5rem;border-radius:5px;pointer-events:none;opacity:0;transition:opacity .1s;white-space:nowrap;backdrop-filter:blur(8px)}
#sp-prog-area:hover #sp-prog-tip{opacity:1}

/* ─── Bottom row ────────────────────────────────────────── */
.sp-btm{display:flex;align-items:center;gap:4px}
.sp-spacer{flex:1}

/* ─── Buttons ───────────────────────────────────────────── */
.sp-btn{background:none;border:none;color:var(--sp-text);cursor:pointer;padding:6px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .14s,transform .1s,color .14s;position:relative}
.sp-btn:hover{background:rgba(255,255,255,.09);transform:scale(1.08)}
.sp-btn:focus,.sp-cr-btn:focus,#senshi-player-root button:focus{outline:none}
.sp-btn:focus-visible,.sp-cr-btn:focus-visible,#senshi-player-root button:focus-visible{outline:2px solid var(--sp-accent);outline-offset:2px}
#senshi-player-root button{-webkit-tap-highlight-color:transparent}
.sp-btn:active{transform:scale(.94)}
.sp-btn svg{width:20px;height:20px;fill:currentColor;display:block}
.sp-btn.sm svg{width:17px;height:17px}
.sp-btn.xs svg{width:15px;height:15px}
.sp-btn.on{color:var(--sp-accent)}
.sp-btn::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:rgba(0,0,0,.9);border:1px solid rgba(255,255,255,.1);color:#fff;font-size:.63rem;padding:.15rem .45rem;border-radius:5px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .12s;backdrop-filter:blur(6px);font-family:var(--sp-hud);letter-spacing:.05em}
.sp-btn:hover::after{opacity:1}

/* ─── Volume ────────────────────────────────────────────── */
.sp-vol-wrap{display:flex;align-items:center;gap:3px;flex-shrink:0}
.sp-vol-slider{-webkit-appearance:none;appearance:none;width:70px;min-width:70px;height:3px;border-radius:3px;background:var(--sp-bar-track);outline:none;cursor:pointer;flex-shrink:0}
.sp-vol-slider::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#fff;cursor:pointer}
.sp-vol-slider::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#fff;border:none;cursor:pointer}

/* ─── Time ──────────────────────────────────────────────── */
.sp-time{font-family:var(--sp-hud);font-size:.7rem;letter-spacing:.04em;color:var(--sp-text-sub);white-space:nowrap;padding:0 3px;font-variant-numeric:tabular-nums}
.sp-time-sep{color:var(--sp-text-muted);margin:0 1px}

/* ─── Menus ─────────────────────────────────────────────── */
.sp-menu{position:absolute;bottom:58px;right:8px;background:var(--sp-menu-bg);border:1px solid var(--sp-border);border-radius:12px;width:min(260px,calc(100% - 16px));z-index:35;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.85),0 0 0 1px var(--sp-border2);backdrop-filter:blur(20px);display:none}
.sp-menu.open{display:block;animation:menu-in .18s cubic-bezier(.16,1,.3,1) both}
@keyframes menu-in{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
.sp-tab-bar{display:flex;border-bottom:1px solid var(--sp-border)}
.sp-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:.55rem .25rem .4rem;background:none;border:none;border-bottom:2px solid transparent;color:var(--sp-text-muted);font-family:var(--sp-hud);font-size:.52rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;cursor:pointer;transition:color .15s,border-color .15s;margin-bottom:-1px}
.sp-tab svg{width:14px;height:14px;fill:currentColor}
.sp-tab:hover{color:var(--sp-text)}
.sp-tab.active{color:var(--sp-accent);border-bottom-color:var(--sp-accent);text-shadow:0 0 8px rgba(232,69,60,.4)}
.sp-tab-panel{padding:.3rem 0 .4rem}
.sp-tab-hidden{display:none}

/* quality list */
.sp-menu-item{display:flex;align-items:center;padding:.5rem .75rem;font-size:.8rem;font-weight:600;font-family:var(--sp-body);color:rgba(255,255,255,.6);cursor:pointer;transition:background .1s,color .1s;gap:.5rem}
.sp-menu-item:hover{background:rgba(232,69,60,.07);color:#fff}
.sp-menu-item.active{color:var(--sp-accent)}
.sp-menu-item.active::after{content:'✓';margin-left:auto;font-size:.72rem}

/* speed grid */
.sp-speed-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:.45rem .6rem}
.sp-speed-opt{padding:.35rem .2rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:6px;color:rgba(255,255,255,.6);font-family:var(--sp-hud);font-size:.65rem;cursor:pointer;transition:all .13s;text-align:center}
.sp-speed-opt:hover{background:rgba(255,255,255,.1);color:#fff}
.sp-speed-opt.active{background:rgba(232,69,60,.12);border-color:rgba(232,69,60,.4);color:var(--sp-accent);text-shadow:0 0 8px rgba(232,69,60,.4)}

/* subtitles panel */
.sp-sub-panel{padding:.4rem .65rem .55rem}
.sp-sub-panel label{display:flex;justify-content:space-between;align-items:center;font-size:.72rem;font-weight:600;color:rgba(255,255,255,.6);padding:.28rem 0;gap:.5rem;font-family:var(--sp-body)}
.sp-sub-panel label span{flex-shrink:0}
.sp-sub-panel input[type=range]{-webkit-appearance:none;appearance:none;flex:1;min-width:0;height:3px;border-radius:3px;background:var(--sp-bar-track);outline:none;cursor:pointer}
.sp-sub-panel input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;border-radius:50%;background:var(--sp-accent);cursor:pointer}
.sp-sub-panel select{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:#fff;font-size:.7rem;padding:.12rem .32rem;border-radius:4px;cursor:pointer;font-family:var(--sp-body);flex-shrink:0;max-width:110px}

/* sub toggle + track row */
/* sub track list items */
.sp-sub-item{display:flex;align-items:center;padding:.48rem .75rem;font-size:.8rem;font-weight:600;font-family:var(--sp-body);color:rgba(255,255,255,.6);cursor:pointer;transition:background .1s,color .1s;gap:.5rem}
.sp-sub-item:hover{background:rgba(232,69,60,.07);color:#fff}
.sp-sub-item.active{color:var(--sp-accent)}
.sp-sub-item.active::after{content:'✓';margin-left:auto;font-size:.72rem}
/* edit style accordion */
.sp-sub-edit-btn{display:flex;align-items:center;justify-content:space-between;width:100%;padding:.38rem .65rem;background:none;border:none;border-top:1px solid var(--sp-border);font-family:var(--sp-body);font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.35);cursor:pointer;transition:color .15s}
.sp-sub-edit-btn:hover{color:rgba(255,255,255,.7)}
.sp-sub-edit-btn svg{transition:transform .2s;flex-shrink:0}
.sp-sub-edit-btn.open svg{transform:rotate(180deg)}
.sp-sub-style-wrap{display:none}
.sp-sub-style-wrap.open{display:block}

/* ─── Subtitle layer ────────────────────────────────────── */
#sp-sub-tokens{display:none}
#sp-sub-layer{position:absolute;left:50%;transform:translateX(-50%);z-index:22;pointer-events:none;max-width:80%;text-align:center}
#sp-sub-layer .sp-sub-line{display:inline-block;font-family:'Arial',sans-serif;font-size:1.05rem;font-weight:700;color:#fff;line-height:1.55;text-shadow:0 1px 3px rgba(0,0,0,.9),0 0 6px rgba(0,0,0,.7);background:rgba(0,0,0,.72);backdrop-filter:blur(4px);border-radius:5px;padding:.22rem .7rem}
#senshi-player-root:fullscreen #sp-sub-layer .sp-sub-line{font-size:calc(1.05rem * 1.45)}

/* ─── Double-tap zones ──────────────────────────────────── */
.sp-zone{position:absolute;top:0;bottom:0;width:30%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:17;opacity:0;transition:opacity .18s}
#sp-zone-l{left:0;background:radial-gradient(ellipse at 20% 50%,rgba(255,255,255,.08) 0%,transparent 70%)}
#sp-zone-r{right:0;background:radial-gradient(ellipse at 80% 50%,rgba(255,255,255,.08) 0%,transparent 70%)}
.sp-zone.show{opacity:1}
.sp-zone-lbl{display:flex;flex-direction:column;align-items:center;gap:4px;color:#fff;font-size:.78rem;font-weight:700;text-shadow:0 1px 3px rgba(0,0,0,.6)}
.sp-zone-lbl svg{width:22px;height:22px;fill:#fff;opacity:.9}

/* ─── Centre play/pause button ──────────────────────────── */
#sp-center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:26px;z-index:18;pointer-events:none;opacity:0;transition:opacity .25s}
#sp-center.show{opacity:1}
#sp-center.show .sp-cr-btn{pointer-events:auto}
.sp-cr-btn{width:72px;height:72px;border-radius:50%;background:rgba(5,7,13,.6);border:1.5px solid rgba(232,69,60,.5);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);cursor:pointer;transition:all .15s;box-shadow:0 0 0 8px rgba(232,69,60,.05),0 0 24px rgba(232,69,60,.15);position:relative;text-decoration:none;flex-shrink:0}
.sp-cr-btn:hover{background:rgba(232,69,60,.18);border-color:var(--sp-accent);box-shadow:0 0 0 12px rgba(232,69,60,.07),0 0 32px rgba(232,69,60,.35)}
.sp-cr-btn:focus{outline:none}
.sp-cr-btn:focus-visible{outline:2px solid var(--sp-accent);outline-offset:3px}
.sp-cr-btn svg{width:30px;height:30px;fill:#fff;display:block}
/* Smaller flanking skip-episode buttons (prev/next) */
.sp-cr-side{width:50px;height:50px;background:rgba(5,7,13,.45);border-color:rgba(255,255,255,.18);box-shadow:none}
.sp-cr-side:hover{background:rgba(232,69,60,.16);border-color:var(--sp-accent);box-shadow:0 0 0 8px rgba(232,69,60,.06),0 0 20px rgba(232,69,60,.25)}
.sp-cr-side svg{width:22px;height:22px}
.sp-cr-side.disabled{opacity:.3;pointer-events:none;cursor:default}
.sp-cr-side.disabled:hover{background:rgba(5,7,13,.45);border-color:rgba(255,255,255,.18)}
.sp-cr-side::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);background:rgba(0,0,0,.9);border:1px solid rgba(255,255,255,.1);color:#fff;font-size:.63rem;padding:.2rem .55rem;border-radius:5px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .12s;backdrop-filter:blur(6px);font-family:var(--sp-hud);letter-spacing:.05em}
.sp-cr-side:hover::after{opacity:1}
@media (max-width:480px){
  #sp-center{gap:14px}
  .sp-cr-btn{width:56px;height:56px}
  .sp-cr-btn svg{width:24px;height:24px}
  .sp-cr-side{width:38px;height:38px}
  .sp-cr-side svg{width:17px;height:17px}
}

/* ─── Keyboard shortcut overlay ─────────────────────────── */
#sp-sc-overlay{position:absolute;inset:0;background:rgba(0,0,0,.82);z-index:50;display:none;align-items:center;justify-content:center;backdrop-filter:blur(6px)}
#sp-sc-overlay.show{display:flex}
.sp-sc-grid{display:grid;grid-template-columns:auto auto;gap:.35rem 1.2rem}
.sp-sc-key{font-family:var(--sp-hud);font-size:.62rem;background:rgba(232,69,60,.1);border:1px solid rgba(232,69,60,.25);color:var(--sp-accent);padding:.15rem .55rem;border-radius:5px;text-align:center;white-space:nowrap;justify-self:end}
.sp-sc-desc{font-size:.72rem;color:var(--sp-text-sub);align-self:center;font-family:var(--sp-body)}

/* ─── Fullscreen ────────────────────────────────────────── */
#senshi-player-root:fullscreen,#senshi-player-root:-webkit-full-screen{border-radius:0;width:100vw!important;height:100vh!important;height:100dvh!important}
#senshi-player-root:fullscreen #sp-video-area,#senshi-player-root:-webkit-full-screen #sp-video-area{aspect-ratio:unset;height:100%}
#senshi-player-root:fullscreen #sp-video,#senshi-player-root:-webkit-full-screen #sp-video{object-fit:contain}
#senshi-player-root:fullscreen #sp-panel,#senshi-player-root:-webkit-full-screen #sp-panel{display:none}

/* ─── INFO PANEL (below video) ──────────────────────────── */
/* PANEL-SPACING-V2 — if you can see this comment in page source but margins still look tight, the browser/server is serving a cached/old copy of this file */

#sp-panel{
  background:var(--sp-surface);
  border-top:1px solid var(--sp-border);
  border-radius:0 0 var(--sp-r) var(--sp-r);
}

/* ── Info strip (above tabs) ────────────────────────────── */
#sp-info-strip{
  display:flex;align-items:center;gap:2px;
  padding:10px 10px;
  border-bottom:1px solid var(--sp-border);
  background:rgba(0,0,0,.18);
  overflow-x:auto;scrollbar-width:none;
}
#sp-info-strip::-webkit-scrollbar{display:none}
.sp-istat{
  position:relative;display:flex;align-items:center;gap:5px;
  padding:3px 8px;border-radius:6px;cursor:default;flex-shrink:0;
  transition:background .15s;
}
.sp-istat:hover{background:rgba(255,255,255,.06)}
.sp-istat svg{width:13px;height:13px;fill:rgba(232,69,60,.7);flex-shrink:0}
.sp-istat-val{font-family:var(--sp-hud);font-size:.6rem;color:var(--sp-text-sub);letter-spacing:.02em;white-space:nowrap}
.sp-istat-sep{width:1px;height:12px;background:var(--sp-border);margin:0 3px;flex-shrink:0}

/* Single floating tooltip, positioned via JS so it's never clipped by the scrolling strip */
#sp-istat-float-tip{
  position:absolute;
  background:rgba(8,10,18,.97);border:1px solid var(--sp-border);
  color:var(--sp-text-sub);font-family:var(--sp-hud);font-size:.5rem;letter-spacing:.09em;
  padding:4px 9px;border-radius:5px;white-space:nowrap;
  pointer-events:none;opacity:0;transition:opacity .12s;z-index:60;text-transform:uppercase;
  transform:translateX(-50%);
}
#sp-istat-float-tip.show{opacity:1}

/* ── Tabs ───────────────────────────────────────────────── */
#sp-panel-tabs{display:flex;border-bottom:1px solid var(--sp-border)}
.sp-ptab{
  flex:1;padding:12px 6px;
  font-family:var(--sp-hud);font-size:.58rem;font-weight:700;
  letter-spacing:.08em;text-transform:uppercase;
  color:var(--sp-text-muted);cursor:pointer;border:none;background:none;
  text-align:center;border-bottom:2px solid transparent;
  transition:color .2s;margin-bottom:-1px;white-space:nowrap;
}
.sp-ptab.active{color:var(--sp-accent);border-bottom-color:var(--sp-accent)}
.sp-ptab:hover{color:var(--sp-text)}
#sp-panel-body{padding:18px 16px 16px!important}
.sp-psec{display:none}.sp-psec.active{display:block}

/* ── Episodes tab ───────────────────────────────────────── */
.sp-ep-nav{display:flex;gap:8px;margin:0 0 16px!important}
.sp-ep-nav-btn{
  flex:1;display:flex;align-items:center;gap:8px;
  padding:10px 12px;background:var(--sp-surface2);
  border:1px solid var(--sp-border);border-radius:9px;
  color:var(--sp-text-sub);font-family:var(--sp-body);font-size:.8rem;font-weight:500;
  cursor:pointer;text-decoration:none;transition:all .18s;
}
.sp-ep-nav-btn:hover{border-color:var(--sp-accent);color:#fff;background:rgba(232,69,60,.07)}
.sp-ep-nav-btn.disabled{opacity:.28;pointer-events:none;cursor:default}
.sp-ep-nav-btn svg{width:16px;height:16px;fill:currentColor;flex-shrink:0}
.sp-ep-nav-lbl{display:flex;flex-direction:column}
.sp-ep-nav-lbl small{font-size:.55rem;color:var(--sp-text-muted);font-family:var(--sp-hud);letter-spacing:.07em;text-transform:uppercase}
.sp-ep-nav-btn.next{justify-content:flex-end;text-align:right}
.sp-ep-divider{
  font-family:var(--sp-hud);font-size:.47rem;letter-spacing:.18em;text-transform:uppercase;
  color:var(--sp-text-muted);margin:0 0 10px!important;padding-bottom:6px;
  border-bottom:1px solid var(--sp-border);
  display:flex;align-items:center;justify-content:space-between;
}
/* grid: collapsed = no scroll, just first chips. expanded = scrollable box */
.sp-ep-grid{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:6px;
  margin-top:2px;
  overflow:hidden;
}
.sp-ep-grid.sp-ep-expanded{
  max-height:152px;overflow-y:auto;
  scrollbar-width:thin;scrollbar-color:rgba(232,69,60,.35) transparent;
  padding-right:3px;
}
.sp-ep-grid.sp-ep-expanded::-webkit-scrollbar{width:4px}
.sp-ep-grid.sp-ep-expanded::-webkit-scrollbar-track{background:transparent}
.sp-ep-grid.sp-ep-expanded::-webkit-scrollbar-thumb{background:rgba(232,69,60,.35);border-radius:2px}
.sp-ep-chip{
  display:block;padding:7px 2px;background:var(--sp-surface2);
  border:1px solid var(--sp-border);border-radius:7px;
  text-align:center;font-family:var(--sp-hud);font-size:.62rem;
  color:var(--sp-text-muted);cursor:pointer;text-decoration:none;transition:all .15s;
}
.sp-ep-chip:hover{border-color:var(--sp-accent);color:#fff;background:rgba(232,69,60,.08)}
.sp-ep-chip.current{border-color:var(--sp-accent);background:rgba(232,69,60,.15);color:var(--sp-accent)}
.sp-ep-chip.sp-ep-extra{display:none}
.sp-ep-grid.sp-ep-expanded .sp-ep-chip.sp-ep-extra{display:block}

/* show more / less button */
.sp-ep-more{
  display:flex;align-items:center;justify-content:center;gap:6px;
  width:100%;margin-top:12px!important;padding:9px;
  background:var(--sp-surface2);border:1px solid var(--sp-border);
  border-radius:8px;color:var(--sp-text-sub);
  font-family:var(--sp-hud);font-size:.6rem;letter-spacing:.06em;text-transform:uppercase;
  cursor:pointer;transition:all .15s;
}
.sp-ep-more:hover{border-color:var(--sp-accent);color:#fff;background:rgba(232,69,60,.08)}
.sp-ep-more svg{width:12px;height:12px;fill:currentColor;transition:transform .2s;flex-shrink:0}
.sp-ep-more.sp-expanded svg{transform:rotate(180deg)}

/* quality panel */
.sp-qual-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sp-qopt{padding:10px 8px;background:var(--sp-surface2);border:1px solid var(--sp-border);border-radius:8px;cursor:pointer;text-align:center;transition:all .18s}
.sp-qopt:hover{border-color:var(--sp-accent);background:rgba(232,69,60,.06)}
.sp-qopt.active{border-color:var(--sp-accent);background:rgba(232,69,60,.12)}
.sp-qopt-lbl{font-family:var(--sp-hud);font-size:.8rem;font-weight:500;color:var(--sp-text)}
.sp-qopt-sub{font-size:.65rem;color:var(--sp-text-muted);margin-top:4px;font-family:var(--sp-body)}

/* speed panel */
.sp-spd-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.sp-sopt{padding:10px 4px;background:var(--sp-surface2);border:1px solid var(--sp-border);border-radius:8px;cursor:pointer;text-align:center;font-family:var(--sp-hud);font-size:.68rem;color:var(--sp-text-muted);transition:all .18s}
.sp-sopt:hover{border-color:var(--sp-accent);color:var(--sp-text)}
.sp-sopt.active{border-color:var(--sp-accent);color:var(--sp-accent);background:rgba(232,69,60,.1);text-shadow:0 0 8px rgba(232,69,60,.35)}

/* stats panel */
.sp-stat-bar{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px!important}
.sp-stat-item{font-family:var(--sp-hud);font-size:.58rem;letter-spacing:.05em;color:var(--sp-text-muted)}
.sp-stat-item span{color:var(--sp-accent)}
#sp-buf-chart{height:48px;background:var(--sp-surface2);border:1px solid var(--sp-border);border-radius:8px;overflow:hidden;display:flex;align-items:flex-end;padding:5px;gap:2px}
.sp-buf-bar{flex:1;border-radius:3px 3px 0 0;background:rgba(232,69,60,.45);min-width:0;transition:height .4s,opacity .4s}

/* shortcuts panel */
.sp-keys-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.sp-key-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.sp-key-row:last-child{border:none}
.sp-kbd{background:var(--sp-surface3);border:1px solid var(--sp-border);border-radius:4px;padding:3px 8px;font-family:var(--sp-hud);font-size:.58rem;color:var(--sp-accent);white-space:nowrap;flex-shrink:0}
.sp-key-desc{font-family:var(--sp-body);font-size:.75rem;color:var(--sp-text-muted)}

/* ─── Mobile ─────────────────────────────────────────────── */
@media(max-width:600px){
  .sp-btn::after{display:none}
  .sp-vol-wrap .sp-vol-slider{width:55px;min-width:55px}
  .sp-top-title{font-size:.64rem}
  #sp-panel-body{padding:16px 12px 14px!important}
  .sp-ptab{font-size:.5rem;padding:11px 4px!important;letter-spacing:.04em}
  .sp-qual-grid{grid-template-columns:repeat(3,1fr)}
  .sp-spd-grid{grid-template-columns:repeat(4,1fr)}
  .sp-keys-grid{grid-template-columns:1fr 1fr}
  .sp-key-desc{font-size:.7rem}
  .sp-ep-grid{grid-template-columns:repeat(auto-fill,minmax(38px,1fr))}
  .sp-ep-grid.sp-ep-expanded{max-height:130px}
}

</style>
`;
