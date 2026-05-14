import { ALL_EVENTS, cc } from "../data/timelineData.js";
import { css } from "../styles.js";

const TAG_COLORS = ["#c8963c","#0868a8","#0a7848","#b03010","#7a5fa5"];

export function BookmarksPanel({
  open,
  bookmarks,
  customTags,
  addingTag,
  newTagInput,
  setUi,
  setAddingTag,
  setNewTagInput,
  addCustomTag,
  removeCustomTag,
  removeBookmark,
  goToResult,
  stateRef,
}) {
  if (!open) return null;

  return (
    <aside style={css.bmViewPanel} aria-label="Signets">
      <div style={{padding:"12px 14px 8px",borderBottom:"1px solid rgba(18,16,14,.08)",display:"flex",alignItems:"center",gap:8}}>
        <div style={{fontFamily:"Georgia,serif",fontSize:14,fontWeight:400,color:"#12100e",flex:1}}>Signets</div>
        <span style={{fontSize:12,color:"rgba(18,16,14,.45)"}}>{Object.keys(bookmarks).length}</span>
        <button aria-label="Fermer les signets" type="button" style={{...css.panelClose,position:"static"}} onClick={()=>setUi(u=>({...u,showBookmarksView:false}))}>x</button>
      </div>
      <div style={{padding:"8px 14px 6px",borderBottom:"1px solid rgba(18,16,14,.06)"}}>
        <div style={{fontSize:10,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(18,16,14,.4)",marginBottom:8}}>Catégories</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {customTags.map(tag=>(
            <div key={tag} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:10,background:"rgba(18,16,14,.05)",border:"1px solid rgba(18,16,14,.1)",fontSize:11}}>
              <span style={{color:"#12100e"}}>{tag}</span>
              <button aria-label={`Supprimer la catégorie ${tag}`} type="button" style={css.inlineIconButton} onClick={()=>removeCustomTag(tag)}>x</button>
            </div>
          ))}
          {addingTag?(
            <div style={{display:"flex",gap:4}}>
              <input autoFocus value={newTagInput} onChange={e=>setNewTagInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")addCustomTag(newTagInput);if(e.key==="Escape"){setAddingTag(false);setNewTagInput("");}}}
                style={{width:96,height:26,border:"1px solid rgba(18,16,14,.2)",borderRadius:5,padding:"0 8px",fontSize:11,fontFamily:"'DM Mono',monospace",outline:"none"}}
                placeholder="Nouvelle..."/>
              <button aria-label="Ajouter la catégorie" type="button" onClick={()=>addCustomTag(newTagInput)} style={{...css.panelClose,position:"static",width:24,height:24,fontSize:10}}>✓</button>
            </div>
          ):(
            <button type="button" style={css.addTagButton} onClick={()=>setAddingTag(true)}>+ Ajouter</button>
          )}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {Object.keys(bookmarks).length===0&&(
          <div style={{padding:"28px 18px",textAlign:"center",fontSize:12,color:"rgba(18,16,14,.42)",lineHeight:1.6}}>
            Aucun signet pour l'instant.<br/>
            <span style={{fontSize:11}}>Ouvrez un événement et cliquez 🔖</span>
          </div>
        )}
        {Object.entries(bookmarks).map(([evId,bm])=>{
          const tagColor=TAG_COLORS[customTags.indexOf(bm.tag)%5]||"#888";
          const ev=ALL_EVENTS.find(e=>e.id===evId)||stateRef.current.aiEvents.find(e=>e.id===evId)||{id:evId,...bm,importance:2,minZoom:0};
          return(
            <div key={evId} role="button" tabIndex={0} className="srch-item" style={css.bmViewItem}
              onClick={()=>goToResult(ev)}
              onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();goToResult(ev);}}}>
              <div style={css.legDot(cc(bm.cat))}/>
              <div style={{flex:1,minWidth:0,textAlign:"left"}}>
                <div style={{fontSize:14,fontFamily:"Georgia,serif",color:"#12100e",marginBottom:3}}>{bm.title}</div>
                <div style={{fontSize:11,color:"#b17a25",marginBottom:4}}>{bm.date_label}</div>
                <div style={css.bmTag(tagColor)}>{bm.tag}</div>
              </div>
              <span role="button" tabIndex={0} aria-label={`Retirer ${bm.title} des signets`} style={{fontSize:13,color:"rgba(18,16,14,.35)",cursor:"pointer",flexShrink:0,marginLeft:4}}
                onClick={e=>{e.stopPropagation();removeBookmark(evId);}}
                onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();removeBookmark(evId);}}}>
                x
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
