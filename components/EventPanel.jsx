import { css } from "../styles.js";

const TAG_COLORS = ["#c8963c","#0868a8","#0a7848","#b03010","#7a5fa5"];
const BAR_HEIGHTS = [7,14,20,14,7];

export function EventPanel({
  ui,
  bookmarks,
  customTags,
  addingTag,
  newTagInput,
  setAddingTag,
  setNewTagInput,
  addCustomTag,
  toggleBookmark,
  closePanel,
  stateRef,
}) {
  const currentEvent = stateRef.current._currentPanelEv;

  return (
    <aside style={css.panel(ui.panelOpen)} aria-hidden={!ui.panelOpen} aria-label="Fiche événement">
      <div style={css.panelStripe(ui.panelCatColor)}/>
      <div style={css.panelHdr}>
        <button aria-label="Fermer la fiche" type="button" style={css.panelClose} onClick={closePanel}>x</button>
        <div style={{...css.panelCat,color:ui.panelCatColor}}>{ui.panelCat}</div>
        <div style={css.panelDate}>{ui.panelDate}</div>
        <div style={css.panelTitle}>{ui.panelTitle}</div>
      </div>
      {ui.panelError&&(
        <div style={css.panelError}>{ui.panelError}</div>
      )}
      {ui.panelEventId&&(
        <div style={{...css.bmBar,position:"relative"}}>
          <span style={{fontSize:11,color:"rgba(18,16,14,.45)",marginRight:2}}>Signet :</span>
          {customTags.map((tag,i)=>{
            const col=TAG_COLORS[i%5];
            const active=currentEvent&&bookmarks[currentEvent.id]?.tag===tag;
            return(
              <button key={tag} type="button" style={css.bmBtn(active,col)}
                onClick={()=>{if(currentEvent)toggleBookmark(currentEvent,tag);}}>
                {active?"✓ ":""}{tag}
              </button>
            );
          })}
          {addingTag?(
            <div style={{display:"flex",gap:3,alignItems:"center"}}>
              <input autoFocus value={newTagInput} onChange={e=>setNewTagInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")addCustomTag(newTagInput);if(e.key==="Escape"){setAddingTag(false);setNewTagInput("");}}}
                style={{width:86,height:24,border:"1px solid rgba(18,16,14,.2)",borderRadius:5,padding:"0 7px",fontSize:11,fontFamily:"'DM Mono',monospace",outline:"none"}}
                placeholder="Nom..."/>
              <button type="button" style={css.inlineConfirmButton} onClick={()=>addCustomTag(newTagInput)}>✓</button>
            </div>
          ):(
            <button type="button" style={{...css.bmBtn(false,"rgba(18,16,14,.3)"),borderStyle:"dashed"}}
              onClick={()=>setAddingTag(true)}>+ Tag</button>
          )}
        </div>
      )}
      <div style={css.panelBody}>
        {ui.panelContent==="loading"?(
          <div style={css.loading} aria-live="polite">
            <div style={css.bars}>{BAR_HEIGHTS.map((h,i)=>(
              <span key={i} style={{width:3,height:h,borderRadius:2,background:"#c8963c",animation:`bw 1s ${i*.15}s ease-in-out infinite`,display:"inline-block"}}/>
            ))}</div>
            <div style={css.barsLbl}>La fiche se prépare...</div>
          </div>
        ):(
          <div style={css.panelContent} dangerouslySetInnerHTML={{__html:ui.panelContent||""}}/>
        )}
      </div>
    </aside>
  );
}
