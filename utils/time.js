import { EPOCHS, UA } from "../data/timelineData.js";

export const L = (ya) => Math.log10(Math.max(ya, 0.1));

export function fmt(ya) {
  if (ya >= 1e9) return `${(ya/1e9).toFixed(1)} Ga`;
  if (ya >= 1e6) return `${Math.round(ya/1e6)} Ma`;
  if (ya >= 1e3) return `${Math.round(ya/1e3)} Ka`;
  const yr = Math.round(2025-ya);
  return yr <= 0 ? `${Math.abs(yr)} av.J.-C.` : yr.toString();
}
export function epochAt(ya) { for (const e of EPOCHS) if (ya<=e.from&&ya>=e.to) return e; return EPOCHS[EPOCHS.length-1]; }
export function makeCoord(vs,ve,W) {
  const ls=L(vs),le=L(ve),range=ls-le;
  return { toX:(ya)=>((ls-L(ya))/range)*W, toYa:(x)=>Math.pow(10,ls-(x/W)*range), logRange:range };
}
export function zoomLvl(vs,ve){ return Math.max(0,Math.log10(UA)-(L(vs)-L(ve))); }

export function buildPrompt(startYa,endYa){
  const span=startYa-endYa;
  let gran,ex;
  if(span>5e9){gran="cosmique, milliards d'années";ex="supernovæ, quasars, nébuleuses";}
  else if(span>500e6){gran="géologique, centaines de Ma";ex="glaciations, extinctions secondaires";}
  else if(span>50e6){gran="paléontologique, millions d'années";ex="faunes locales, flores, migrations";}
  else if(span>1e6){gran="préhistorique, centaines de Ka";ex="sites archéologiques, pratiques culturelles";}
  else if(span>50e3){gran="néolithique, millénaires";ex="fondations de cités, inventions matérielles";}
  else if(span>5000){gran="antique/médiéval, siècles";ex="batailles, traités, inventions, personnages";}
  else if(span>200){gran="historique précis, décennies";ex="événements politiques, scientifiques, culturels";}
  else{gran="très précis, années";ex="personnes, œuvres, découvertes précises";}
  return `Historien expert. Génère des événements supplémentaires entre ${fmt(startYa)} et ${fmt(Math.max(endYa,0.1))} avant aujourd'hui. Granularité : ${gran}. Exemples : ${ex}.
RÈGLES : répondre UNIQUEMENT par un tableau JSON valide (sans markdown). 4 à 6 événements, tous dans la fenêtre. Ne pas répéter les événements déjà présents dans la base (Big Bang, Terre, dinosaures, Napoléon, etc.).
Format : [{"yearsAgo":number,"title":"max 5 mots","date_label":"date lisible","desc":"1 phrase","cat":"cosmique|geologique|biologique|prehistoire|histoire"}]`;
}
