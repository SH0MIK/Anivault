export function watchScript2(animeId: number, epNum: number, siteUrl: string, epDurationSec: number): string {
  return `<script>
(function(){
  if(!window.__loggedIn)return;
  var ANIME_ID=${animeId};
  var EP_NUM=${epNum};
  var SITE_URL=${JSON.stringify(siteUrl)};
  var EP_DUR=${epDurationSec};
  var wallBase=0,wallStart=null,wallRunning=false,lastSaved=0;

  function wallNow(){if(!wallRunning||!wallStart)return wallBase;return Math.min(wallBase+Math.floor((Date.now()-wallStart)/1000),EP_DUR);}
  window.__wallNow=wallNow;
  function wallPlay(){if(!wallRunning){wallStart=Date.now();wallRunning=true;}}
  function wallPause(){if(wallRunning){wallBase=wallNow();wallStart=null;wallRunning=false;}}

  function updateUI(){
    var pos=wallNow();
    var pct=EP_DUR>0?Math.min(100,(pos/EP_DUR)*100):0;
    var fill=document.getElementById('wp-prog-fill');
    var time=document.getElementById('wp-prog-time');
    var wrap=document.getElementById('wp-prog');
    if(wrap&&pos>=5)wrap.style.display='';
    if(fill)fill.style.width=pct.toFixed(1)+'%';
    if(time){var m=Math.floor(pos/60),s=pos%60,dm=Math.floor(EP_DUR/60),ds=EP_DUR%60;time.textContent=m+':'+(s<10?'0':'')+s+' / '+dm+':'+(ds<10?'0':'')+ds;}
  }

  function save(){var pos=wallNow();if(pos<5||pos===lastSaved)return;lastSaved=pos;fetch(SITE_URL+'/api/watch_history.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save_progress',anime_id:ANIME_ID,episode_num:EP_NUM,watch_time:pos,episode_duration:EP_DUR})}).catch(function(){});}

  function load(cb){fetch(SITE_URL+'/api/watch_history.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'get_progress',anime_id:ANIME_ID,episode_num:EP_NUM})}).then(function(r){return r.json();}).then(function(d){if(d.success&&d.watch_time>0)wallBase=parseInt(d.watch_time);cb&&cb();}).catch(function(){cb&&cb();});}

  var urlT=parseInt(new URLSearchParams(window.location.search).get('t')||'0');
  load(function(){
    if(urlT>30&&urlT>wallBase)wallBase=urlT;
    if(wallBase>=30){
      setTimeout(function(){var m=Math.floor(wallBase/60),s=wallBase%60;if(typeof showToast==='function')showToast('▶ Resumed from '+m+':'+(s<10?'0':'')+s,'success');updateUI();},1500);
      setTimeout(function(){var f=document.getElementById('main-player-iframe')||document.querySelector('#watch-player-wrap iframe');if(!f)return;try{var v=f.contentDocument&&f.contentDocument.querySelector('video');if(v)v.currentTime=wallBase;}catch(e){}},2000);
    }
    setInterval(function(){save();updateUI();},5000);
  });

  var area=document.getElementById('watch-player-wrap');if(area)area.addEventListener('click',function(){setTimeout(wallPlay,800);});

  window.addEventListener('message',function(e){var d=e.data;if(!d||typeof d!=='object')return;var ev=d.type||d.event||'';if(ev==='play'||ev==='playing')wallPlay();if(ev==='pause'||ev==='paused')wallPause();if(ev==='ended'||ev==='complete'){wallPause();wallBase=EP_DUR;save();}var ct=d.currentTime||(d.detail&&d.detail.currentTime);if(ct&&Math.abs(ct-wallNow())>10){wallBase=Math.floor(ct);wallStart=wallRunning?Date.now():null;}});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'){wallPause();save();}});
  window.addEventListener('beforeunload',function(){save();});
})();
</script>
`;
}
