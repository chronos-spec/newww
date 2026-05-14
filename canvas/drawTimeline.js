import { ALL_EVENTS, EPOCHS, LIFE_TREE, PERIODS, cc } from "../data/timelineData.js";
import { L, fmt, makeCoord, zoomLvl } from "../utils/time.js";

export function drawAll(canvas, miniCanvas, params) {
  const {vs,ve,aiEvents,selectedId,hoveredId} = params;
  const W=canvas.width, H=canvas.height;
  const ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,W,H);
  const coord=makeCoord(vs,ve,W), {toX}=coord;
  const zl=zoomLvl(vs,ve);
  const LINE_Y=Math.round(H*0.44), TREE_TOP=Math.round(H*0.56), TREE_H=Math.round(H*0.40);
  const PERIOD_H=18, PERIOD_Y=LINE_Y-PERIOD_H-1;

  // Epoch bands — more opaque for readability
  for(const ep of EPOCHS){
    const x1=toX(ep.from),x2=toX(Math.max(ep.to,0.1));
    if(Math.min(x1,x2)>W||Math.max(x1,x2)<0) continue;
    const rx=Math.max(0,Math.min(x1,x2)),rw=Math.min(W,Math.abs(x2-x1));
    // Solid background — more opaque
    ctx.fillStyle=ep.bg+"f5"; ctx.fillRect(rx,56,rw,PERIOD_Y-56);
    ctx.fillStyle=ep.stripe; ctx.fillRect(rx,56,rw,4);
    // Epoch label — larger and bolder
    if(rw>80){
      ctx.save(); ctx.beginPath(); ctx.rect(rx+5,63,rw-10,22); ctx.clip();
      ctx.font="600 11px 'DM Mono',monospace"; ctx.fillStyle=ep.text+"ff"; ctx.textAlign="left";
      ctx.fillText(ep.label.toUpperCase(),rx+7,75); ctx.restore();
    } else if(rw>30){
      ctx.save(); ctx.beginPath(); ctx.rect(rx+2,63,rw-4,18); ctx.clip();
      ctx.font="600 9px 'DM Mono',monospace"; ctx.fillStyle=ep.text+"ff"; ctx.textAlign="left";
      ctx.fillText(ep.label.toUpperCase().slice(0,6),rx+3,73); ctx.restore();
    }
    if(x1>1&&x1<W-1){
      ctx.strokeStyle=ep.stripe+"88"; ctx.lineWidth=1.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x1,59); ctx.lineTo(x1,PERIOD_Y); ctx.stroke();
    }
  }

  // Geological periods band — ICS colors, taller for readability
  for(const per of PERIODS){
    const x1=toX(per.from),x2=toX(Math.max(per.to,0.1));
    if(Math.min(x1,x2)>W||Math.max(x1,x2)<0) continue;
    const rx=Math.max(0,Math.min(x1,x2)),rw=Math.min(W,Math.abs(x2-x1));
    if(rw<1) continue;
    ctx.fillStyle=per.color;
    ctx.fillRect(rx,PERIOD_Y,rw,PERIOD_H);
    ctx.strokeStyle="rgba(0,0,0,.22)"; ctx.lineWidth=0.6; ctx.setLineDash([]);
    ctx.strokeRect(rx+0.3,PERIOD_Y+0.3,rw-0.6,PERIOD_H-0.6);
    if(rw>32){
      ctx.save(); ctx.beginPath(); ctx.rect(rx+2,PERIOD_Y,rw-4,PERIOD_H); ctx.clip();
      ctx.font="600 8.5px 'DM Mono',monospace";
      ctx.fillStyle=per.textColor||"#fff";
      ctx.textAlign="center";
      ctx.shadowColor="rgba(0,0,0,.25)"; ctx.shadowBlur=2;
      ctx.fillText(per.label, rx+rw/2, PERIOD_Y+PERIOD_H-4);
      ctx.shadowBlur=0; ctx.restore();
    }
  }

  // ── ARBRE DE LA VIE ──────────────────────────────────────────────────────
  ctx.fillStyle="rgba(10,8,6,.97)"; ctx.fillRect(0,TREE_TOP-2,W,TREE_H+10);
  ctx.strokeStyle="rgba(200,150,60,.35)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,TREE_TOP-2); ctx.lineTo(W,TREE_TOP-2); ctx.stroke();

  // Label
  ctx.font="600 9px 'DM Mono',monospace"; ctx.fillStyle="rgba(200,150,60,.7)";
  ctx.textAlign="left"; ctx.letterSpacing="0.15em";
  ctx.fillText("ARBRE DE LA VIE",10,TREE_TOP+11);

  const NROWS_TREE=17;
  const rowH=Math.min((TREE_H-16)/NROWS_TREE,14);

  for(const node of LIFE_TREE){
    const x1=toX(node.from), x2=toX(Math.max(node.to,0.1));
    if(Math.min(x1,x2)>W||Math.max(x1,x2)<0) continue;
    const rx=Math.max(0,Math.min(x1,x2)), rw=Math.min(W,Math.abs(x2-x1));
    if(rw<1) continue;

    const ry=TREE_TOP+14+node.row*rowH;
    const rh=Math.max(rowH-2,4);
    const extinct=node.to>0;

    // Bar
    ctx.fillStyle=extinct?node.color+"99":node.color+"dd";
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(rx,ry,rw,rh,2); else ctx.rect(rx,ry,rw,rh);
    ctx.fill();

    // Extinction marker (right end)
    if(extinct&&node.to>0){
      const ex=toX(node.to);
      if(ex>0&&ex<W){
        ctx.fillStyle="#ef4444";
        ctx.beginPath(); ctx.moveTo(ex-4,ry+1); ctx.lineTo(ex+1,ry+rh/2); ctx.lineTo(ex-4,ry+rh-1); ctx.closePath(); ctx.fill();
      }
    }

    // Label
    if(rw>45){
      const depth=node.depth||0;
      const indent=depth*8;
      ctx.save(); ctx.beginPath(); ctx.rect(rx+3+indent,ry,rw-6-indent,rh); ctx.clip();
      const fs=Math.min(rh-1,10);
      ctx.font=`${node.depth<=2?"600":"500"} ${fs}px 'DM Mono',monospace`;
      ctx.fillStyle=extinct?"rgba(255,255,255,.5)":"rgba(255,255,255,.92)";
      ctx.textAlign="left";
      ctx.fillText(node.label, rx+5+indent, ry+rh/2+fs*0.35);
      ctx.restore();
    }
  }

  // Tree legend
  ctx.font="8px 'DM Mono',monospace"; ctx.fillStyle="rgba(255,255,255,.25)"; ctx.textAlign="right";
  ctx.fillText("▶ rouge = extinction",W-8,TREE_TOP+TREE_H+4);

  // Timeline
  ctx.strokeStyle="rgba(18,16,14,.28)"; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(0,LINE_Y); ctx.lineTo(W,LINE_Y); ctx.stroke();

  // Ticks
  const span=vs-ve;
  const IVS=[1e10,5e9,2e9,1e9,5e8,2e8,1e8,5e7,1e7,5e6,1e6,5e5,1e5,1e4,1e3,500,100,50,10,5,2,1];
  let chosen=IVS[0]; for(const iv of IVS){if(span/iv>=5&&span/iv<=16){chosen=iv;break;}}
  ctx.font="9px 'DM Mono',monospace";
  for(let ya=Math.ceil(ve/chosen)*chosen;ya<=vs;ya+=chosen){
    if(ya<0.1) continue;
    const x=toX(ya); if(x<0||x>W) continue;
    ctx.strokeStyle="rgba(18,16,14,.16)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x,LINE_Y-5); ctx.lineTo(x,LINE_Y+5); ctx.stroke();
    const lbl=fmt(ya),tw=ctx.measureText(lbl).width;
    ctx.fillStyle="rgba(250,247,242,.9)"; ctx.fillRect(x-tw/2-2,LINE_Y+7,tw+4,13);
    ctx.fillStyle="rgba(18,16,14,.38)"; ctx.textAlign="center"; ctx.fillText(lbl,x,LINE_Y+18);
  }

  // Filter events by zoom
  const all=[...ALL_EVENTS.filter(ev=>ev.minZoom<=zl), ...aiEvents];
  const vis=all.filter(ev=>{const x=toX(ev.yearsAgo);return x>=-80&&x<=W+80;});
  // Sort: importance first so important events win dedup
  vis.sort((a,b)=>(a.importance||2)-(b.importance||2));

  // Spatial dedup: keep most important when within 24px
  const deduped=[];
  for(const ev of vis){
    const x=toX(ev.yearsAgo);
    if(!deduped.find(p=>Math.abs(p.x-x)<24)) deduped.push({x,ev});
  }
  deduped.sort((a,b)=>a.x-b.x);

  const placed=[];
  for(const {x,ev} of deduped){
    const col=cc(ev.cat), imp=ev.importance||2;
    const isHov=hoveredId===ev.id, isSel=selectedId===ev.id;
    const nearby=placed.filter(p=>Math.abs(p.x-x)<78);
    const side=nearby.length>0&&nearby[nearby.length-1].side===1?-1:1;
    placed.push({x,ev,side});

    // Scale factor: shrink less-important events when zoomed out
    const zThresh=imp===1?0:imp===2?1.5:2.5;
    const zExcess=Math.max(0,zl-zThresh);
    const scaleFactor=Math.min(1,0.25+zExcess*0.3);
    const sF=isSel||isHov?1:scaleFactor;

    const baseStem=imp===1?64:imp===2?50:38;
    const stemLen=(side===1?baseStem:baseStem-14)*sF;
    const endY=LINE_Y-side*stemLen;

    // Halo
    if(isHov||isSel){ctx.beginPath();ctx.arc(x,LINE_Y,12,0,Math.PI*2);ctx.fillStyle=col+"14";ctx.fill();}

    // Stem
    ctx.strokeStyle=(isHov||isSel)?col:col+(imp===1?"cc":imp===2?"77":"44");
    ctx.lineWidth=((isHov||isSel)?2:imp===1?1.5:imp===2?1:0.6)*sF;
    ctx.setLineDash(imp===1?[]:imp===2?[5,3]:[2,5]);
    ctx.beginPath();ctx.moveTo(x,LINE_Y);ctx.lineTo(x,endY);ctx.stroke();ctx.setLineDash([]);

    // Dot — scales with sF
    const baseR=isSel?7:isHov?6:imp===1?5:imp===2?3.5:2.5;
    const r=Math.max(baseR*sF,isSel||isHov?baseR:1.2);
    ctx.beginPath();ctx.arc(x,LINE_Y,r,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
    if(imp===1&&!isSel&&sF>0.5){ctx.beginPath();ctx.arc(x,LINE_Y,Math.max(r-2.5,0.5),0,Math.PI*2);ctx.fillStyle="rgba(250,247,242,.85)";ctx.fill();}
    if(isSel){ctx.beginPath();ctx.arc(x,LINE_Y,r+5,0,Math.PI*2);ctx.strokeStyle=col+"66";ctx.lineWidth=1.5;ctx.stroke();}

    // Label — only show if dot is large enough or active
    const minR=imp===1?2:imp===2?2.5:3;
    if(r>=minR||isHov||isSel){
      const fontSize=Math.max(7,(imp===1?11:10)*sF);
      const maxW=imp===1?112:96;
      ctx.font=(imp===1?"500 ":"")+Math.round(fontSize)+"px 'DM Mono',monospace";
      const words=ev.title.split(" ");
      let line="",lines=[];
      for(const w of words){const t=line+w+" ";if(ctx.measureText(t).width>maxW&&line){lines.push(line.trim());line=w+" ";}else line=t;}
      lines.push(line.trim());
      const lh=Math.round(fontSize)+2;
      const startY=endY-side*8-(side===1?lines.length*lh:0);
      const bgA=sF>0.7?(imp===1?".9":imp===2?".8":".65"):(imp===1?".7":".5");
      lines.forEach((l,i)=>{
        const tw2=ctx.measureText(l).width;
        ctx.fillStyle=`rgba(250,247,242,${bgA})`;
        ctx.beginPath();
        if(ctx.roundRect)ctx.roundRect(x-tw2/2-3,startY+i*lh-lh+2,tw2+6,lh,2);
        else ctx.fillRect(x-tw2/2-3,startY+i*lh-lh+2,tw2+6,lh);
        ctx.fill();
        ctx.fillStyle=(isHov||isSel)?col:col+(imp===1?"f0":imp===2?sF>0.6?"cc":"99":"88");
        ctx.textAlign="center";
        ctx.fillText(l,x,startY+i*lh);
      });
    }
  }

  // Today
  const nowX=toX(0.5);
  if(nowX>2&&nowX<W-2){
    ctx.strokeStyle="rgba(180,40,30,.5)";ctx.lineWidth=1.2;ctx.setLineDash([5,4]);
    ctx.beginPath();ctx.moveTo(nowX,LINE_Y-55);ctx.lineTo(nowX,TREE_TOP+TREE_H);ctx.stroke();ctx.setLineDash([]);
    ctx.font="bold 8px 'DM Mono',monospace";ctx.fillStyle="#b42820";ctx.textAlign="center";
    ctx.fillText("AUJOURD'HUI",nowX,LINE_Y-60);
  }

  // Minimap
  if(miniCanvas){
    const mw=miniCanvas.width,mh=miniCanvas.height,mctx=miniCanvas.getContext("2d");
    mctx.clearRect(0,0,mw,mh);
    const tls=Math.log10(UA),tle=0,tR=tls-tle;
    for(const ep of EPOCHS){
      const ex1=(tls-L(ep.from))/tR*mw,ex2=(tls-L(Math.max(ep.to,0.1)))/tR*mw;
      mctx.fillStyle=ep.stripe+"44";mctx.fillRect(Math.max(0,ex1),3,Math.abs(ex2-ex1),mh-6);
      mctx.fillStyle=ep.stripe+"aa";mctx.fillRect(Math.max(0,ex1),3,1,mh-6);
    }
    for(const ev of ALL_EVENTS.filter(e=>e.importance===1)){
      const lv=L(ev.yearsAgo);if(lv<tle||lv>tls)continue;
      const mx=(tls-lv)/tR*mw;
      mctx.beginPath();mctx.arc(mx,mh/2,2,0,Math.PI*2);mctx.fillStyle=cc(ev.cat)+"99";mctx.fill();
    }
    const vls=L(vs),vle=L(Math.max(ve,0.1));
    const vx1=(tls-vls)/tR*mw,vx2=(tls-vle)/tR*mw;
    mctx.fillStyle="rgba(18,16,14,.12)";mctx.fillRect(Math.max(0,vx1),0,vx2-vx1,mh);
    mctx.strokeStyle="rgba(18,16,14,.55)";mctx.lineWidth=1.5;mctx.strokeRect(Math.max(0,vx1),0,vx2-vx1,mh);
  }
  return {placed,LINE_Y,PERIOD_Y,PERIOD_H,TREE_TOP};
}
