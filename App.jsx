import { useState, useEffect, useRef, useCallback } from "react";
import { ALL_EVENTS, EPOCHS, PERIODS, PERIOD_DESCRIPTIONS, STATIC_CONTENT, UA, cc } from "./data/timelineData.js";
import { buildPrompt, epochAt, fmt, L, makeCoord, zoomLvl } from "./utils/time.js";
import { drawAll } from "./canvas/drawTimeline.js";
import { css } from "./styles.js";
import { Topbar } from "./components/Topbar.jsx";
import { Legend } from "./components/Legend.jsx";
import { ZoomControls } from "./components/ZoomControls.jsx";
import { TimelineTooltip } from "./components/TimelineTooltip.jsx";
import { BookmarksPanel } from "./components/BookmarksPanel.jsx";
import { EventPanel } from "./components/EventPanel.jsx";
import { StatusBar } from "./components/StatusBar.jsx";
import { ExploreCards } from "./components/ExploreCards.jsx";

export default function Chronos() {
  const canvasRef=useRef(null),miniRef=useRef(null),wrapRef=useRef(null);
  const S=useRef({vs:UA*1.04,ve:20,aiEvents:[],selectedId:null,hoveredId:null,fetchedZones:new Set(),fetching:false,fetchQueue:[],panelCache:{},placed:[],lineY:0});
  const rafRef=useRef(null),fetchDebRef=useRef(null),animRef=useRef(null);

  // ── STORAGE: load saved content + bookmarks on mount ──
  useEffect(()=>{
    (async()=>{
      try{
        // Load cached rich content
        const cached=JSON.parse(localStorage.getItem("chronos-cache") || "null");
        if(cached && typeof cached === "object") Object.assign(S.current.panelCache,cached);
      }catch(e){}
      try{
        // Load bookmarks
        const bm=JSON.parse(localStorage.getItem("chronos-bookmarks") || "null");
        if(bm && typeof bm === "object") setBookmarks(bm);
      }catch(e){}
      try{
        // Load custom tags
        const tags=JSON.parse(localStorage.getItem("chronos-tags") || "null");
        if(Array.isArray(tags)) setCustomTags(tags);
      }catch(e){}
    })();
  },[]);

  const saveCache=useCallback(async()=>{
    try{ localStorage.setItem("chronos-cache",JSON.stringify(S.current.panelCache)); }catch(e){}
  },[]);

  const saveBookmarks=useCallback(async(bm)=>{
    try{ localStorage.setItem("chronos-bookmarks",JSON.stringify(bm)); }catch(e){}
  },[]);

  const saveTags=useCallback(async(tags)=>{
    try{ localStorage.setItem("chronos-tags",JSON.stringify(tags)); }catch(e){}
  },[]);

  useEffect(()=>{
    const onResize=()=>setIsMobile(window.innerWidth<760);
    window.addEventListener("resize",onResize);
    return()=>window.removeEventListener("resize",onResize);
  },[]);

  const toggleBookmark=useCallback((ev,tag)=>{
    setBookmarks(prev=>{
      const next={...prev};
      if(next[ev.id]?.tag===tag){
        delete next[ev.id]; // remove if same tag clicked again
      } else {
        next[ev.id]={tag,title:ev.title,date_label:ev.date_label,cat:ev.cat,yearsAgo:ev.yearsAgo,desc:ev.desc||""};
      }
      saveBookmarks(next);
      return next;
    });
    setUi(u=>({...u,showBookmarkMenu:false}));
  },[saveBookmarks]);

  const removeBookmark=useCallback((evId)=>{
    setBookmarks(prev=>{
      const next={...prev};
      delete next[evId];
      saveBookmarks(next);
      return next;
    });
  },[saveBookmarks]);

  const addCustomTag=useCallback((tag)=>{
    if(!tag.trim())return;
    setCustomTags(prev=>{
      const next=[...prev,tag.trim()];
      saveTags(next);
      return next;
    });
    setNewTagInput(""); setAddingTag(false);
  },[saveTags]);

  const removeCustomTag=useCallback((tag)=>{
    setCustomTags(prev=>{
      const next=prev.filter(t=>t!==tag);
      saveTags(next);
      return next;
    });
    // Remove bookmarks using this tag
    setBookmarks(prev=>{
      const next=Object.fromEntries(Object.entries(prev).filter(([,v])=>v.tag!==tag));
      saveBookmarks(next);
      return next;
    });
  },[saveTags,saveBookmarks]);
  const [ui,setUi]=useState({epochLabel:"Vue globale",range:"",aiVisible:false,aiLabel:"",legendOpen:false,panelOpen:false,panelCat:"",panelCatColor:"#555",panelDate:"",panelTitle:"",panelContent:null,panelError:null,tooltip:null,searchOpen:false,searchQuery:"",searchResults:[],searchLoading:false,searchDone:false,searchError:null,panelEventId:null,bookmarkTag:null,showBookmarkMenu:false,showBookmarksView:false});
  const [bookmarks,setBookmarks]=useState({});       // {eventId: {tag, title, date_label, cat, yearsAgo}}
  const [customTags,setCustomTags]=useState(["Favori","À revoir","Intéressant"]); // editable list
  const [addingTag,setAddingTag]=useState(false);
  const [newTagInput,setNewTagInput]=useState("");
  const [isMobile,setIsMobile]=useState(()=>typeof window!=="undefined"&&window.innerWidth<760);

  const redraw=useCallback(()=>{
    const cnv=canvasRef.current,mcnv=miniRef.current,wrap=wrapRef.current;
    if(!cnv||!wrap)return;
    const nextW=wrap.offsetWidth,nextH=wrap.offsetHeight;
    if(cnv.width!==nextW) cnv.width=nextW;
    if(cnv.height!==nextH) cnv.height=nextH;
    if(mcnv){
      if(mcnv.width!==160) mcnv.width=160;
      if(mcnv.height!==28) mcnv.height=28;
    }
    const s=S.current;
    const r=drawAll(cnv,mcnv,{vs:s.vs,ve:s.ve,aiEvents:s.aiEvents,selectedId:s.selectedId,hoveredId:s.hoveredId});
    s.placed=r.placed;s.lineY=r.LINE_Y;s.periodY=r.PERIOD_Y;s.periodH=r.PERIOD_H;s.treeTop=r.TREE_TOP;
    const mid=makeCoord(s.vs,s.ve,cnv.width).toYa(cnv.width/2);
    const ep=epochAt(mid);
    setUi(u=>({...u,epochLabel:ep.label+"  ·  "+fmt(s.vs)+" → "+fmt(Math.max(s.ve,0.1)),range:`zoom ×${Math.pow(10,zoomLvl(s.vs,s.ve)).toFixed(0)}`}));
  },[]);

  const scheduleRedraw=useCallback(()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);rafRef.current=requestAnimationFrame(redraw);},[redraw]);

  const navigateToEpoch=useCallback((ep)=>{
    if(animRef.current)cancelAnimationFrame(animRef.current);
    const s=S.current,targetVs=ep.from*1.05,targetVe=Math.max(ep.to*0.8,0.1);
    const startVs=s.vs,startVe=s.ve,steps=28;let step=0;
    const animate=()=>{step++;const t=step/steps,ease=t<0.5?2*t*t:-1+(4-2*t)*t;
      const ls=L(startVs)+(L(targetVs)-L(startVs))*ease,le=L(startVe)+(L(targetVe)-L(startVe))*ease;
      s.vs=Math.pow(10,ls);s.ve=Math.pow(10,le);scheduleRedraw();
      if(step<steps)animRef.current=requestAnimationFrame(animate);};
    animRef.current=requestAnimationFrame(animate);
  },[scheduleRedraw]);

  const fetchZone=useCallback(async(startYa,endYa)=>{
    const s=S.current,key=`${L(startYa).toFixed(2)}_${L(Math.max(endYa,0.1)).toFixed(2)}`;
    if(s.fetchedZones.has(key))return;
    if(s.fetching){if(!s.fetchQueue.find(q=>q.key===key))s.fetchQueue.push({key,startYa,endYa});return;}
    s.fetching=true;s.fetchedZones.add(key);
    setUi(u=>({...u,aiVisible:true,aiLabel:`${fmt(startYa)} → ${fmt(Math.max(endYa,0.1))}`}));
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":import.meta.env.VITE_ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-3-5-sonnet-20241022",max_tokens:900,messages:[{role:"user",content:buildPrompt(startYa,endYa)}]})});
      if(!res.ok)throw new Error(res.status);
      const data=await res.json();
      const raw=(data.content||[]).find(b=>b.type==="text")?.text||"[]";
      const match=raw.match(/\[[\s\S]*?\]/);if(!match)throw new Error("no array");
      const evs=JSON.parse(match[0]);let added=0;
      for(const ev of evs){
        const ya=Number(ev.yearsAgo);if(!ev.title||isNaN(ya)||ya<0)continue;
        if(s.aiEvents.find(e=>Math.abs(L(e.yearsAgo)-L(ya))<0.02&&e.title===ev.title))continue;
        s.aiEvents.push({id:`ai_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,yearsAgo:ya,title:ev.title,date_label:ev.date_label||fmt(ya),desc:ev.desc||"",cat:ev.cat||"histoire",importance:3,minZoom:0});
        added++;
      }
      if(added>0)scheduleRedraw();
    }catch(e){console.warn("AI:",e);}
    finally{
      s.fetching=false;setTimeout(()=>setUi(u=>({...u,aiVisible:false})),700);
      if(s.fetchQueue.length>0){const n=s.fetchQueue.shift();if(!s.fetchedZones.has(n.key))setTimeout(()=>fetchZone(n.startYa,n.endYa),350);}
    }
  },[scheduleRedraw]);

  const triggerFetch=useCallback(()=>{
    clearTimeout(fetchDebRef.current);
    fetchDebRef.current=setTimeout(()=>{
      const s=S.current,ls=L(s.vs),le=L(Math.max(s.ve,0.1));
      fetchZone(s.vs,Math.max(s.ve,0.1));
      if(ls-le>0.7){const mid=Math.pow(10,(ls+le)/2);fetchZone(s.vs,mid);fetchZone(mid,Math.max(s.ve,0.1));}
    },800);
  },[fetchZone]);

  const fetchRich=useCallback(async(ev)=>{
    const s=S.current;
    // 1. Pre-written static content — instant, no API
    if(STATIC_CONTENT[ev.id]){setUi(u=>({...u,panelContent:STATIC_CONTENT[ev.id],panelEventId:ev.id}));return;}
    // 2. Already cached (from storage or previous API call)
    if(s.panelCache[ev.id]){setUi(u=>({...u,panelContent:s.panelCache[ev.id],panelEventId:ev.id}));return;}
    // 3. Generate via API then persist
    setUi(u=>({...u,panelContent:"loading",panelError:null,panelEventId:ev.id}));
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":import.meta.env.VITE_ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-3-5-sonnet-20241022",max_tokens:900,messages:[{role:"user",content:`Rédige une fiche encyclopédique engageante sur :
Événement : ${ev.title}
Date : ${ev.date_label}
Contexte : ${ev.desc}
En HTML simple (<p>,<h3>,<strong> uniquement). Sections : intro immersive (1§), <h3>Contexte</h3>(1§), <h3>Ce qui s'est passé</h3>(1§), <h3>Héritage</h3>(1§), <h3>Le saviez-vous ?</h3>(1§). ~260 mots. HTML direct, sans balises html/body.`}]})});
      if(!res.ok)throw new Error(`Erreur API ${res.status}`);
      const data=await res.json();
      const html=(data.content||[]).find(b=>b.type==="text")?.text||"<p>Indisponible.</p>";
      s.panelCache[ev.id]=html;
      setUi(u=>({...u,panelContent:html,panelError:null,panelEventId:ev.id}));
      saveCache(); // persist to storage
    }catch(e){setUi(u=>({...u,panelContent:"<p>La fiche détaillée n'a pas pu être chargée pour le moment.</p>",panelError:"Connexion à l'IA indisponible. Vous pouvez réessayer en rouvrant cette fiche.",panelEventId:ev.id}));}
  },[saveCache]);

  const openPeriodPanel=useCallback((item)=>{
    S.current.selectedId=null; scheduleRedraw();
    const desc=PERIOD_DESCRIPTIONS[item.label]||{summary:"",highlights:[]};
    const html=`<p style="font-family:Georgia,serif;font-size:14px;line-height:1.8;color:#12100e;margin-bottom:12px">${desc.summary}</p>`+
      (desc.highlights.length?`<h3 style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:rgba(18,16,14,.4);margin:14px 0 8px">Points clés</h3><ul style="list-style:none;padding:0;margin:0">${desc.highlights.map(h=>`<li style="font-family:Georgia,serif;font-size:13px;color:#12100e;padding:5px 0;border-bottom:1px solid rgba(18,16,14,.06);display:flex;align-items:flex-start;gap:8px"><span style="color:#c8963c;flex-shrink:0">◆</span>${h}</li>`).join("")}</ul>`:"");
    setUi(u=>({...u,panelOpen:true,panelCat:item.from>1e9?"ÈRE":"PÉRIODE",
      panelCatColor:item.stripe||item.color||"#c8963c",
      panelDate:fmt(item.from)+" → "+(item.to>0?fmt(item.to):"aujourd'hui"),
      panelTitle:item.label,panelContent:html,panelError:null,tooltip:null,panelEventId:"period_"+item.label,showBookmarkMenu:false}));
    S.current._currentPanelEv={id:"period_"+item.label,title:item.label,date_label:fmt(item.from),yearsAgo:item.from,cat:"geologique"};
  },[scheduleRedraw]);

  const openPanel=useCallback((ev)=>{
    S.current._currentPanelEv=ev;
    scheduleRedraw();
    setUi(u=>({...u,panelOpen:true,panelCat:ev.cat.toUpperCase(),panelCatColor:cc(ev.cat),panelDate:ev.date_label,panelTitle:ev.title,panelContent:"loading",panelError:null,tooltip:null,panelEventId:ev.id,showBookmarkMenu:false}));
    fetchRich(ev);
  },[scheduleRedraw,fetchRich]);

  const closePanel=useCallback(()=>{S.current.selectedId=null;scheduleRedraw();setUi(u=>({...u,panelOpen:false}));},[scheduleRedraw]);

  const searchDebRef=useRef(null);

  // Universal search: local match + AI search across all of human history
  const searchWithAI=useCallback(async(query)=>{
    if(!query.trim()){setUi(u=>({...u,searchResults:[],searchDone:false,searchLoading:false,searchError:null}));return;}

    // 1. Local match
    const q=query.toLowerCase();
    const s=S.current;
    const local=[...ALL_EVENTS,...s.aiEvents].filter(ev=>
      ev.title.toLowerCase().includes(q)||
      ev.desc.toLowerCase().includes(q)||
      ev.date_label.toLowerCase().includes(q)||
      ev.cat.toLowerCase().includes(q)
    ).slice(0,4);
    setUi(u=>({...u,searchResults:local,searchLoading:true,searchDone:false,searchError:null}));

    // 2. Universal AI search — any event in all of history
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":import.meta.env.VITE_ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-3-5-sonnet-20241022",max_tokens:1000,
          messages:[{role:"user",content:`Tu es un historien et scientifique expert de toute l'histoire de l'univers, de la Terre, de la vie et de l'humanité.

L'utilisateur recherche : "${query}"

Trouve les événements historiques, scientifiques, biologiques ou cosmiques les plus pertinents correspondant à cette recherche. Tu peux inclure :
- Des événements très précis et peu connus (batailles, inventions, naissances, découvertes, traités...)
- Des personnages historiques (leur naissance ou mort comme événement)
- Des phénomènes naturels, géologiques, biologiques
- N'importe quelle période de l'histoire, de n'importe quel pays ou région du monde
- Des événements aussi petits ou grands que nécessaire pour répondre à la requête

Réponds UNIQUEMENT par un tableau JSON valide (sans markdown). Max 6 résultats, du plus pertinent au moins pertinent :
[{"yearsAgo":number,"title":"titre court max 6 mots","date_label":"date précise lisible","desc":"1-2 phrases de description factuelle","cat":"cosmique|geologique|biologique|prehistoire|histoire","relevance":"lien avec la recherche en 4 mots max"}]

IMPORTANT : yearsAgo doit être un nombre positif représentant combien d'années avant 2025. Ex: 1804 ap.J.-C. → yearsAgo=221, 500 av.J.-C. → yearsAgo=2525.
Si aucun événement réel ne correspond, retourne [].`}]})});
      if(!res.ok)throw new Error(res.status);
      const data=await res.json();
      const raw=(data.content||[]).find(b=>b.type==="text")?.text||"[]";
      const match=raw.match(/\[[\s\S]*?\]/);
      if(!match)throw new Error("no array");
      const aiResults=JSON.parse(match[0]);
      const merged=[...local];
      for(const r of aiResults){
        const ya=Number(r.yearsAgo);
        if(isNaN(ya)||ya<0)continue;
        const dup=merged.find(e=>e.title.toLowerCase()===r.title.toLowerCase());
        if(!dup){
          merged.push({
            id:`srch_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
            yearsAgo:ya,title:r.title,date_label:r.date_label||"",
            desc:r.desc||"",cat:r.cat||"histoire",
            relevance:r.relevance,importance:2,minZoom:0,fromSearch:true
          });
        }
      }
      setUi(u=>({...u,searchResults:merged.slice(0,8),searchLoading:false,searchDone:true,searchError:null}));
    }catch(e){
      setUi(u=>({...u,searchLoading:false,searchDone:true,searchError:"La recherche IA est indisponible. Les résultats locaux restent affichés."}));
    }
  },[]);

  const handleSearch=useCallback((query)=>{
    setUi(u=>({...u,searchQuery:query,searchResults:[],searchDone:false,searchError:null}));
    clearTimeout(searchDebRef.current);
    if(!query.trim()){setUi(u=>({...u,searchLoading:false,searchError:null}));return;}
    searchDebRef.current=setTimeout(()=>searchWithAI(query),500);
  },[searchWithAI]);

  // Navigate to a search result: zoom in on the event, add it if not present, open panel
  const goToResult=useCallback((ev)=>{
    // Add to aiEvents if not already there
    const s=S.current;
    if(!ALL_EVENTS.find(e=>e.id===ev.id)&&!s.aiEvents.find(e=>e.id===ev.id)){
      s.aiEvents.push({...ev,importance:ev.importance||2,minZoom:0});
    }
    // Animate to event: zoom in to ~50× around the event's date
    const targetYa=ev.yearsAgo;
    const span=Math.max(targetYa*0.15,500); // show ±15% of event date, min 500 years
    const targetVs=targetYa+span, targetVe=Math.max(targetYa-span,0.1);
    if(animRef.current)cancelAnimationFrame(animRef.current);
    const startVs=s.vs,startVe=s.ve,steps=30;let step=0;
    const animate=()=>{
      step++;const t=step/steps,ease=t<0.5?2*t*t:-1+(4-2*t)*t;
      const ls=L(startVs)+(L(targetVs)-L(startVs))*ease,le=L(startVe)+(L(targetVe)-L(startVe))*ease;
      s.vs=Math.pow(10,ls);s.ve=Math.pow(10,le);
      scheduleRedraw();
      if(step<steps)animRef.current=requestAnimationFrame(animate);
      else{
        // Open panel after animation
        setUi(u=>({...u,searchOpen:false,searchQuery:"",searchResults:[],searchDone:false}));
        openPanel(ev);
        triggerFetch();
      }
    };
    animRef.current=requestAnimationFrame(animate);
  },[scheduleRedraw,openPanel,triggerFetch]);

  const zoomAround=useCallback((pivotYa,factor)=>{
    const s=S.current;
    const ns=pivotYa+(s.vs-pivotYa)*factor,ne=pivotYa+(s.ve-pivotYa)*factor;
    if(ns>UA*1.1||ne<0.05)return;if(L(ns)-L(Math.max(ne,0.1))<0.03)return;
    s.vs=Math.min(ns,UA*1.1);s.ve=Math.max(ne,0.05);
  },[]);

  const resetView=useCallback(()=>{
    S.current.vs=UA*1.04;
    S.current.ve=20;
    scheduleRedraw();
    triggerFetch();
  },[scheduleRedraw,triggerFetch]);

  const zoomFromCenter=useCallback((factor)=>{
    const s=S.current,W=canvasRef.current?.width||800;
    const center=makeCoord(s.vs,s.ve,W).toYa(W/2);
    zoomAround(center,factor);
    scheduleRedraw();
    triggerFetch();
  },[scheduleRedraw,triggerFetch,zoomAround]);

  // Stable refs so useEffect never needs to re-register listeners
  const openPanelRef=useRef(openPanel);
  const openPeriodPanelRef=useRef(openPeriodPanel);
  const closePanelRef=useRef(closePanel);
  const scheduleRedrawRef=useRef(scheduleRedraw);
  const triggerFetchRef=useRef(triggerFetch);
  const zoomAroundRef=useRef(zoomAround);
  useEffect(()=>{openPanelRef.current=openPanel;},[openPanel]);
  useEffect(()=>{openPeriodPanelRef.current=openPeriodPanel;},[openPeriodPanel]);
  useEffect(()=>{closePanelRef.current=closePanel;},[closePanel]);
  useEffect(()=>{scheduleRedrawRef.current=scheduleRedraw;},[scheduleRedraw]);
  useEffect(()=>{triggerFetchRef.current=triggerFetch;},[triggerFetch]);
  useEffect(()=>{zoomAroundRef.current=zoomAround;},[zoomAround]);

  useEffect(()=>{
    const wrap=wrapRef.current,cnv=canvasRef.current;if(!wrap||!cnv)return;
    const onWheel=(e)=>{
      e.preventDefault();
      const rect=cnv.getBoundingClientRect();
      zoomAroundRef.current(makeCoord(S.current.vs,S.current.ve,cnv.width).toYa(e.clientX-rect.left),e.deltaY>0?1.13:.88);
      scheduleRedrawRef.current();triggerFetchRef.current();
    };
    let dragging=false;
    const onMD=()=>{dragging=true;wrap.style.cursor="grabbing";};
    const onMU=()=>{dragging=false;wrap.style.cursor="grab";};
    const onMM=(e)=>{
      const rect=cnv.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top;
      if(dragging){
        const s=S.current,lr=L(s.vs)-L(s.ve),sh=-(e.movementX/cnv.width)*lr,ls=L(s.vs)+sh,le=L(s.ve)+sh;
        if(ls>Math.log10(UA*1.1)||le<0)return;
        s.vs=Math.pow(10,ls);s.ve=Math.pow(10,le);
        scheduleRedrawRef.current();triggerFetchRef.current();return;
      }
      const s=S.current;let found=null;
      for(const p of s.placed)if(Math.abs(p.x-mx)<18&&Math.abs(s.lineY-my)<100){found=p.ev;break;}
      const nid=found?found.id:null;
      if(nid!==s.hoveredId){
        s.hoveredId=nid;wrap.style.cursor=found?"pointer":"grab";scheduleRedrawRef.current();
        if(found){let tx=mx+16,ty=my-68;if(tx+220>cnv.width)tx=mx-226;if(ty<10)ty=my+20;setUi(u=>({...u,tooltip:{x:tx,y:ty,date:found.date_label,title:found.title}}));}
        else setUi(u=>({...u,tooltip:null}));
      }
    };
    const onClick=(e)=>{
      const rect=cnv.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top,s=S.current;
      // 1. Event dots — enlarged hit area
      for(const p of s.placed)if(Math.abs(p.x-mx)<20&&Math.abs(s.lineY-my)<120){openPanelRef.current(p.ev);return;}
      // 2. Period band click
      if(s.periodY!=null&&my>=s.periodY&&my<=s.periodY+(s.periodH||20)){
        const ya=makeCoord(s.vs,s.ve,cnv.width).toYa(mx);
        const per=PERIODS.find(p=>ya<=p.from&&ya>=p.to);
        if(per){openPeriodPanelRef.current(per);return;}
      }
      // 3. Epoch band click (above period band)
      if(s.periodY!=null&&my<s.periodY&&my>44){
        const ya=makeCoord(s.vs,s.ve,cnv.width).toYa(mx);
        const ep=EPOCHS.find(p=>ya<=p.from&&ya>=p.to);
        if(ep){openPeriodPanelRef.current(ep);return;}
      }
      closePanelRef.current();
    };
    let lt=null,ld=null;
    const onTS=(e)=>{if(e.touches.length===1)lt=e.touches[0].clientX;else if(e.touches.length===2)ld=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);};
    const onTM=(e)=>{
      e.preventDefault();const rect=cnv.getBoundingClientRect(),s=S.current;
      if(e.touches.length===1&&lt!==null){const dx=e.touches[0].clientX-lt;lt=e.touches[0].clientX;const lr=L(s.vs)-L(s.ve),sh=-(dx/cnv.width)*lr,ls=L(s.vs)+sh,le=L(s.ve)+sh;if(ls>Math.log10(UA*1.1)||le<0)return;s.vs=Math.pow(10,ls);s.ve=Math.pow(10,le);scheduleRedrawRef.current();triggerFetchRef.current();}
      else if(e.touches.length===2&&ld!==null){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);const mx=(e.touches[0].clientX+e.touches[1].clientX)/2-rect.left;zoomAroundRef.current(makeCoord(s.vs,s.ve,cnv.width).toYa(mx),ld/d);ld=d;scheduleRedrawRef.current();triggerFetchRef.current();}
    };
    const onTE=()=>{lt=null;ld=null;};
    const onResize=()=>scheduleRedrawRef.current();
    cnv.addEventListener("wheel",onWheel,{passive:false});
    cnv.addEventListener("mousedown",onMD);
    cnv.addEventListener("click",onClick);
    cnv.addEventListener("touchstart",onTS,{passive:false});
    cnv.addEventListener("touchmove",onTM,{passive:false});
    cnv.addEventListener("touchend",onTE);
    window.addEventListener("mousemove",onMM);
    window.addEventListener("mouseup",onMU);
    window.addEventListener("resize",onResize);
    scheduleRedrawRef.current();triggerFetchRef.current();
    return()=>{
      cnv.removeEventListener("wheel",onWheel);cnv.removeEventListener("mousedown",onMD);cnv.removeEventListener("click",onClick);
      cnv.removeEventListener("touchstart",onTS);cnv.removeEventListener("touchmove",onTM);cnv.removeEventListener("touchend",onTE);
      window.removeEventListener("mousemove",onMM);window.removeEventListener("mouseup",onMU);window.removeEventListener("resize",onResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  return (
    <div style={css.app}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');@keyframes dp{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.5)}}@keyframes bw{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}@keyframes spin{to{transform:rotate(360deg)}}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#d8d0c3;border-radius:999px}.srch-item:hover{background:#f5f0e8!important}.srch-item{font:inherit;text-align:left;border:0;background:transparent;width:100%}button:hover{transform:translateY(-1px)}button:active{transform:translateY(0)}@media (max-width:1120px){.chronos-shell{grid-template-columns:280px minmax(0,1fr)!important}}@media (max-width:860px){.chronos-shell{display:flex!important;flex-direction:column!important;height:auto!important;min-height:100vh}.chronos-sidebar{position:relative!important;max-height:none!important;border-right:0!important;border-bottom:1px solid rgba(23,20,18,.10)!important}.chronos-main{min-height:calc(100vh - 360px);padding:14px!important}.chronos-mini{display:none}.chronos-header{align-items:flex-start!important;flex-direction:column!important}.chronos-explore{grid-template-columns:repeat(2,minmax(0,1fr))!important}.chronos-toolbar-hint{display:none}}@media (max-width:520px){.chronos-explore{grid-template-columns:1fr!important}.chronos-actions{width:100%}.chronos-actions button{flex:1}.chronos-page-title{font-size:34px!important}}`}</style>

      <div className="chronos-shell" style={css.shell}>
        <Topbar
          ui={ui}
          setUi={setUi}
          handleSearch={handleSearch}
          goToResult={goToResult}
          navigateToEpoch={navigateToEpoch}
          resetView={resetView}
          isMobile={isMobile}
        />

        <main className="chronos-main" style={css.main}>
          <header className="chronos-header" style={css.mainHeader}>
            <div>
              <div style={css.eyebrow}>Chronos Atlas</div>
              <h1 className="chronos-page-title" style={css.pageTitle}>Explore toute l'histoire, simplement.</h1>
              <p style={css.pageSubtitle}>{ui.epochLabel}</p>
            </div>
            <div className="chronos-actions" style={css.headerActions}>
              <button type="button" style={css.primaryAction} onClick={resetView}>Vue globale</button>
              <button type="button" style={css.secondaryAction} onClick={()=>setUi(u=>({...u,legendOpen:!u.legendOpen,showBookmarksView:false}))}>Légende</button>
              <button type="button" style={css.secondaryAction} onClick={()=>setUi(u=>({...u,showBookmarksView:!u.showBookmarksView,legendOpen:false}))}>Signets</button>
            </div>
          </header>

          <ExploreCards navigateToEpoch={navigateToEpoch}/>

          <section style={css.timelineCard}>
            <div style={css.timelineToolbar}>
              <div style={css.timelineMeta}>
                <span style={css.metaLabel}>Navigation</span>
                <span style={css.metaValue}>{ui.range || "zoom ×1"}</span>
              </div>
              <div className="chronos-toolbar-hint" style={css.toolbarHint}>Molette pour zoomer, glisser pour se déplacer, clic pour ouvrir une fiche.</div>
            </div>

            <div ref={wrapRef} style={css.wrap}>
              <canvas ref={canvasRef} style={css.cnv} aria-label="Frise chronologique interactive"/>
              <Legend open={ui.legendOpen}/>
              <ZoomControls onZoomIn={()=>zoomFromCenter(.72)} onZoomOut={()=>zoomFromCenter(1.38)}/>
              <div className="chronos-mini" style={css.mini}><canvas ref={miniRef} aria-hidden="true"/></div>
              <TimelineTooltip tooltip={ui.tooltip}/>
              <BookmarksPanel
                open={ui.showBookmarksView}
                bookmarks={bookmarks}
                customTags={customTags}
                addingTag={addingTag}
                newTagInput={newTagInput}
                setUi={setUi}
                setAddingTag={setAddingTag}
                setNewTagInput={setNewTagInput}
                addCustomTag={addCustomTag}
                removeCustomTag={removeCustomTag}
                removeBookmark={removeBookmark}
                goToResult={goToResult}
                stateRef={S}
              />
              <EventPanel
                ui={ui}
                bookmarks={bookmarks}
                customTags={customTags}
                addingTag={addingTag}
                newTagInput={newTagInput}
                setAddingTag={setAddingTag}
                setNewTagInput={setNewTagInput}
                addCustomTag={addCustomTag}
                toggleBookmark={toggleBookmark}
                closePanel={closePanel}
                stateRef={S}
              />
            </div>
          </section>

          <StatusBar ui={ui}/>
        </main>
      </div>
    </div>
  );
}
