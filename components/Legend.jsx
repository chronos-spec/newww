import { CAT_COL, LIFE_TREE } from "../data/timelineData.js";
import { css } from "../styles.js";

export function Legend({ open }) {
  return (
    <aside style={css.legend(open)} aria-hidden={!open}>
      <div style={{...css.legHead,marginBottom:9}}>Importance</div>
      {[["●●","Majeur - tige pleine, gros point"],["●·","Notable - pointillé fin"],["·","Contextuel - pointillé léger"]].map(([s,l])=>(
        <div key={l} style={{...css.legItem,marginBottom:5,alignItems:"flex-start"}}>
          <span style={{fontSize:14,color:"#8a6000",flexShrink:0,marginTop:1}}>{s[0]}</span>
          <span style={{fontSize:12,color:"rgba(18,16,14,.62)",lineHeight:1.45}}>{l}</span>
        </div>
      ))}
      <div style={{...css.legHead,marginTop:13}}>Catégories</div>
      {Object.entries(CAT_COL).map(([k,v])=>(
        <div key={k} style={css.legItem}><div style={css.legDot(v)}/><span style={css.legLbl}>{k.charAt(0).toUpperCase()+k.slice(1)}</span></div>
      ))}
      <div style={{...css.legHead,marginTop:13}}>Espèces</div>
      {LIFE_TREE.slice(0,8).map(s=>(
        <div key={s.label} style={css.legItem}><div style={css.legBar(s.color)}/><span style={css.legLbl}>{s.label}</span></div>
      ))}
      <div style={{...css.legHead,marginTop:13}}>Navigation</div>
      {["Molette -> zoom","Drag -> déplacer","Clic -> fiche IA","Pilules -> époque animée","Maison -> vue complète"].map(t=>(
        <div key={t} style={{fontSize:12,color:"rgba(18,16,14,.55)",marginBottom:6,lineHeight:1.55}}>{t}</div>
      ))}
    </aside>
  );
}
