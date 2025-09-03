// Inject "⚡ Zap" button on YouTube cards and hide blocked ones
(() => {
  const BTN_CLASS = "zap-btn-pill";
  const RENDERERS = ["ytd-rich-item-renderer","ytd-video-renderer","ytd-grid-video-renderer","ytd-compact-video-renderer","ytd-reel-item-renderer","ytd-reel-video-renderer","ytd-rich-grid-slim-media"];
  const THUMB_SELECTORS = ["a#thumbnail","a#video-title-link","a#media-container","a#shorts-thumbnail"];
  let blockedMap = {};

  chrome.storage.sync.get({ blockedVideosMap: {} }, ({ blockedVideosMap }) => {
    blockedMap = blockedVideosMap || {};
    hideAllBlocked();
    enhanceAll();
  });
  chrome.storage.onChanged.addListener((c, area)=>{
    if(area==="sync" && c.blockedVideosMap){
      blockedMap = c.blockedVideosMap.newValue || {};
      hideAllBlocked();
    }
  });

  function idFromHref(href){
    if(!href) return null;
    let m = href.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if(m) return m[1];
    m = href.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  function extract(node){
    const as = node.querySelectorAll("a[href]");
    for(const a of as){
      const id = idFromHref(a.getAttribute("href"));
      if(id){
        // title fallback chain
        const titleEl = node.querySelector("#video-title,#video-title-link,h3,yt-formatted-string");
        const title =
          (titleEl && (titleEl.getAttribute("title") || titleEl.textContent || "").trim()) ||
          (a.getAttribute("title") || a.textContent || "").trim() ||
          "Unknown";
        let thumb=null;
        for(const s of THUMB_SELECTORS){
          const t = node.querySelector(s);
          if(t){ thumb = t; break; }
        }
        return { id, title, thumb };
      }
    }
    return null;
  }
  function closestRenderer(el){
    for(const tag of RENDERERS){ const r = el.closest(tag); if(r) return r; }
    return el;
  }
  function hideById(id){
    document.querySelectorAll(`a[href*="watch?v=${id}"],a[href*="/shorts/${id}"]`).forEach(a=>{
      const r = closestRenderer(a);
      if(r) r.style.display="none";
    });
  }
  function hideAllBlocked(){
    Object.keys(blockedMap).forEach(hideById);
  }
  function attach(container, info){
    if(!container || container.querySelector(`.${BTN_CLASS}`)) return;
    const btn=document.createElement("button");
    btn.className=BTN_CLASS; btn.type="button";
    btn.textContent="🔥Gone!";
    btn.title="Delete this video permanently";
    btn.addEventListener("click",(e)=>{
      e.preventDefault(); e.stopPropagation(); block(info);
    }, {passive:false});
    const cs=getComputedStyle(container);
    if(cs.position==="static") container.style.position="relative";
    container.appendChild(btn);
  }
  function enhanceAll(root=document){
    root.querySelectorAll(RENDERERS.join(",")).forEach(card=>{
      if(card.__zap) return;
      const info = extract(card);
      if(!info) return;
      if(blockedMap[info.id]){ card.style.display="none"; return; }
      attach(info.thumb||card, info);
      card.__zap=true;
    });
  }
  function block(info){
    chrome.storage.sync.get({ blockedVideosMap:{}, zapStats:{} }, (d)=>{
      const m = d.blockedVideosMap || {};
      if(!m[info.id]) m[info.id] = {
        id: info.id,
        title: info.title || "Unknown",
        url: `https://www.youtube.com/watch?v=${info.id}`,
        reason: "Dislike",
        ts: Date.now()
      };
      const stats = d.zapStats || {};
      const key = new Date().toISOString().slice(0,10);
      stats[key] = (stats[key]||0)+1;
      chrome.storage.sync.set({ blockedVideosMap:m, zapStats:stats }, ()=> hideById(info.id));
    });
  }

  new MutationObserver(()=>{ hideAllBlocked(); enhanceAll(); })
    .observe(document.documentElement||document.body, { childList:true, subtree:true });

  const style=document.createElement("style");
  style.textContent = `.${BTN_CLASS}{position:absolute;top:8px;right:8px;z-index:10;padding:6px 10px;border:none;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;background:#e53935;color:#fff;opacity:.95;box-shadow:0 2px 6px rgba(0,0,0,.2)}.${BTN_CLASS}:hover{opacity:1}`;
  document.documentElement.appendChild(style);
})();