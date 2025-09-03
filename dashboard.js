const VERSION = "v4.3.2";
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// runtime translations (selector-controlled)
const i18n = {
  en:{today:"Today's Zaps",total:"Total Zaps",recent:"Recently Blocked",trend:"7-Day Trend", blocked:"Blocked", keywords:"Keywords"},
  bn:{today:"আজকের জ্যাপ",total:"মোট জ্যাপ",recent:"সাম্প্রতিক ব্লক",trend:"৭ দিনের ট্রেন্ড", blocked:"ব্লকড", keywords:"কিওয়ার্ডস"},
  fr:{today:"Zaps du jour",total:"Zaps totaux",recent:"Récemment bloqué",trend:"Tendance 7 jours", blocked:"Bloqués", keywords:"Mots-clés"},
  de:{today:"Heutige Zaps",total:"Zaps gesamt",recent:"Kürzlich blockiert",trend:"7‑Tage‑Trend", blocked:"Blockiert", keywords:"Schlüsselwörter"},
  nl:{today:"Zaps vandaag",total:"Zaps totaal",recent:"Onlangs geblokkeerd",trend:"7‑daagse trend", blocked:"Geblokkeerd", keywords:"Trefwoorden"},
  es:{today:"Zaps de hoy",total:"Zaps totales",recent:"Recientemente bloqueados",trend:"Tendencia 7 días", blocked:"Bloqueados", keywords:"Palabras clave"},
  zh:{today:"今日隐藏",total:"总隐藏",recent:"最近隐藏",trend:"近7天趋势", blocked:"已隐藏", keywords:"关键词"},
  pt:{today:"Zaps de hoje",total:"Zaps totais",recent:"Recentemente bloqueados",trend:"Tendência 7 dias", blocked:"Bloqueados", keywords:"Palavras-chave"},
  ko:{today:"오늘의 Zaps",total:"총 Zaps",recent:"최근 차단",trend:"7일 추세", blocked:"차단됨", keywords:"키워드"},
  ru:{today:"Сегодняшние Zaps",total:"Всего Zaps",recent:"Недавно скрыто",trend:"Тренд за 7 дней", blocked:"Заблокировано", keywords:"Ключевые слова"},
  hi:{today:"आज के ज़ैप",total:"कुल ज़ैप",recent:"हाल में ब्लॉक",trend:"7‑दिन रुझान", blocked:"ब्लॉक", keywords:"कीवर्ड्स"},
  ar:{today:"عمليات اليوم",total:"الإجمالي",recent:"المحجوبة حديثًا",trend:"اتجاه 7 أيام", blocked:"محظور", keywords:"الكلمات المفتاحية"}
};

const KEYS_DEFAULT = [
 "murder, kill, gunfight, shooting, massacre, stabbing, torture, beheading",
 "free money, giveaway scam, bitcoin hack, earn $1000, get rich quick, robux hack, vbucks hack",
 "casino, slots, betting, poker win, roulette, jackpot",
 "prank gone wrong, fake guru, click here, viral hack, shocking truth",
 "flat earth, illuminati, secret truth, chemtrails, reptilian, fake moon landing"
].join("\n");

function applyLang(code){
  const t = i18n[code] || i18n.en;
  $("#t_today").textContent = t.today;
  $("#t_total").textContent = t.total;
  $("#t_recent").textContent = t.recent;
  $("#t_trend").textContent = t.trend;
  // tabs text remain English for now (optional to localize)
}

function drawBars(canvas,data){
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const w=canvas.width, h=canvas.height;
  ctx.clearRect(0,0,w,h);
  const max=Math.max(1,...data), pad=24, gap=8;
  const barW=Math.floor((w-pad*2)/data.length)-gap;
  data.forEach((v,i)=>{
    const x=pad+i*(barW+gap);
    const bh=Math.round((v/max)*(h-30));
    ctx.fillStyle="#6c63ff";
    ctx.fillRect(x,h-10-bh,barW,bh);
  });
  ctx.fillStyle=getComputedStyle(document.body).color;
  ctx.font="12px Inter, Arial";
  ctx.fillText("0",4,h-2);
}

function render(){
  $("#versionLabel").textContent = VERSION;
  $("#footerVersion").textContent = VERSION;

  chrome.storage.sync.get({theme:"light",lang:"en",zapStats:{},blockedVideosMap:{},keywords:[]},(d)=>{
    document.body.classList.toggle("dark", d.theme==="dark");
    $("#mode").textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";

    // language selector
    const langSel = $("#lang");
    if(!langSel.dataset.init){
      const langs = Object.keys(i18n);
      langs.forEach(code => {
        const opt = document.createElement("option");
        opt.value = code; opt.textContent = code.toUpperCase();
        langSel.appendChild(opt);
      });
      langSel.dataset.init = "1";
    }
    langSel.value = d.lang || "en";
    applyLang(langSel.value);

    // KPIs
    const todayKey=new Date().toISOString().slice(0,10);
    const today=d.zapStats[todayKey]||0;
    const total=Object.values(d.zapStats).reduce((a,b)=>a+(b||0),0);
    $("#kpi_today").textContent = today;
    $("#kpi_total").textContent = total;

    // Recent
    const rec = Object.values(d.blockedVideosMap).sort((a,b)=>b.ts-a.ts).slice(0,5);
    $("#recent_list").innerHTML = rec.length
      ? rec.map(r=>`<div>• ${r.title||"Unknown"} <span class="muted small">(${r.id})</span></div>`).join("")
      : "No data yet";

    // Trend (7 days)
    const days=[...Array(7)].map((_,i)=>{
      const dte=new Date(Date.now()-(6-i)*86400000).toISOString().slice(0,10);
      return d.zapStats[dte]||0;
    });
    drawBars($("#trend"), days);

    // Breakdown
    let manual=0,keyword=0,channel=0;
    Object.values(d.blockedVideosMap).forEach(v=>{
      if(v.reason==="manual") manual++;
      else if(v.reason==="keyword") keyword++;
      else if(v.reason==="channel") channel++;
    });
    drawBars($("#breakdown"), [manual,keyword,channel]);

    // Table
    const tbody = $("#blockedTable tbody");
    tbody.innerHTML = "";
    Object.values(d.blockedVideosMap).sort((a,b)=>b.ts-a.ts).forEach(v=>{
      const dt=v.ts?new Date(v.ts):null;
      const tr=document.createElement("tr");
      tr.innerHTML = `<td>${v.title||"Unknown"}</td>
        <td>${v.id}</td>
        <td>${dt?dt.toLocaleString():""}</td>
        <td>${v.reason||""}</td>
        <td><button class="btn ghost unblock" data-id="${v.id}">Unblock</button></td>`;
      tbody.appendChild(tr);
    });
  });
}

// --- Events ---
document.addEventListener("click",(e)=>{
  const t=e.target.closest(".tab");
  if(t){
    $$(".tab").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    $$(".section").forEach(s=>s.classList.remove("active"));
    $("#"+t.dataset.tab).classList.add("active");
  }
  const un=e.target.closest(".unblock[data-id]");
  if(un){
    const id=un.getAttribute("data-id");
    chrome.storage.sync.get({blockedVideosMap:{}},(d)=>{
      const m=d.blockedVideosMap||{}; delete m[id];
      chrome.storage.sync.set({blockedVideosMap:m}, render);
    });
  }
});

$("#btnUnblockAll").addEventListener("click",()=>{
  chrome.storage.sync.set({blockedVideosMap:{}}, render);
});
$("#btnExport").addEventListener("click",()=>{
  chrome.storage.sync.get({blockedVideosMap:{}},(d)=>{
    const blob = new Blob([JSON.stringify(d.blockedVideosMap,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="zap_blocked.json"; a.click();
    URL.revokeObjectURL(url);
  });
});
$("#search").addEventListener("input",(e)=>{
  const q=e.target.value.toLowerCase();
  $$("#blockedTable tbody tr").forEach(tr=>{
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
  });
});
$("#saveKw").addEventListener("click",()=>{
  const list = ($("#kw").value||"").split(/\\n+/).map(s=>s.trim()).filter(Boolean);
  chrome.storage.sync.set({keywords:list}, ()=> alert("Keywords saved."));
});
$("#mode").addEventListener("click",()=>{
  const dark=!document.body.classList.contains("dark");
  document.body.classList.toggle("dark", dark);
  $("#mode").textContent = dark ? "☀️" : "🌙";
  chrome.storage.sync.set({theme: dark ? "dark" : "light"});
});
$("#lang").addEventListener("change",(e)=>{
  const v=e.target.value;
  chrome.storage.sync.set({lang:v}, ()=> applyLang(v));
});
$("#demo").addEventListener("click",()=>{
  // seed demo data
  chrome.storage.sync.get({blockedVideosMap:{}, zapStats:{}},(d)=>{
    const m=d.blockedVideosMap||{};
    const now = Date.now();
    const sample=[
      {id:"dQw4w9WgXcQ",title:"Sample Video A",reason:"manual",ts:now-3600e3},
      {id:"aBcDeFgHiJ1",title:"Sample Video B",reason:"keyword",ts:now-2*3600e3},
      {id:"ZyXwVuTsRq2",title:"Sample Video C",reason:"channel",ts:now-3*3600e3}
    ];
    sample.forEach(s=>m[s.id]=s);
    const stats=d.zapStats||{};
    for(let i=0;i<7;i++){
      const key=new Date(Date.now()-i*86400000).toISOString().slice(0,10);
      stats[key]=(stats[key]||0)+Math.floor(Math.random()*3);
    }
    chrome.storage.sync.set({blockedVideosMap:m, zapStats:stats}, render);
  });
});

// Load keywords box on first load
chrome.storage.sync.get({keywords:[]},(d)=>{
  $("#kw").value = (d.keywords && d.keywords.length) ? d.keywords.join("\\n") : KEYS_DEFAULT;
});

render();

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const message = document.getElementById("message").value;

      alert(`✅ Thank you, ${name}! Your request has been noted:\n"${message}"`);

      form.reset();
    });
  }
});
