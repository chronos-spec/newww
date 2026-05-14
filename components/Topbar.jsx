import { EPOCHS, PERIODS, cc } from "../data/timelineData.js";
import { css } from "../styles.js";

export function Topbar({
  ui,
  setUi,
  handleSearch,
  goToResult,
  navigateToEpoch,
  resetView,
  isMobile,
}) {
  return (
    <aside className="chronos-sidebar" style={isMobile ? {...css.sidebar, ...css.sidebarMobile} : css.sidebar}>
      <div style={css.sidebarHeader}>
        <div style={css.brandBlock}>
          <div style={css.brand}>Chronos<span style={css.brandSub}>IA</span></div>
          <div style={css.brandLine}>Histoire de l'univers, de la Terre et du vivant.</div>
        </div>
        <button style={css.compactButton} type="button" onClick={resetView} aria-label="Revenir à la vue globale">Reset</button>
      </div>

      <div style={css.sidebarSection}>
        <div style={css.sectionTitle}>Recherche</div>
        <div style={css.searchWrap}>
          <span style={css.searchIcon}>⌕</span>
          <input
            aria-label="Rechercher un événement"
            style={css.searchInput}
            placeholder="Rechercher : Lune, Rome, dinosaures..."
            value={ui.searchQuery}
            onChange={e=>handleSearch(e.target.value)}
            onFocus={()=>setUi(u=>({...u,searchOpen:true}))}
            onBlur={()=>setTimeout(()=>setUi(u=>({...u,searchOpen:false})),200)}
          />
          {ui.searchQuery&&(
            <button aria-label="Effacer la recherche" type="button" style={css.searchClear} onMouseDown={e=>{e.preventDefault();handleSearch("");}}>x</button>
          )}
          {ui.searchOpen&&ui.searchQuery&&(
            <div style={css.searchDropdown}>
              <div style={css.searchHeader}>
                <span style={css.searchHeaderTxt}>
                  {ui.searchLoading?"Recherche IA en cours...":ui.searchDone?`${ui.searchResults.length} resultat${ui.searchResults.length!==1?"s":""}`:ui.searchResults.length>0?"Resultats locaux...":""}
                </span>
                {ui.searchLoading&&<div style={css.searchSpinner}/>}
                {ui.searchDone&&<span style={css.searchAiBadge}>IA</span>}
              </div>
              {ui.searchError&&(
                <div style={css.searchError}>{ui.searchError}</div>
              )}
              {ui.searchResults.length===0&&!ui.searchLoading&&ui.searchDone&&!ui.searchError&&(
                <div style={css.searchEmpty}>Aucun événement trouvé pour « {ui.searchQuery} »</div>
              )}
              {ui.searchResults.length===0&&!ui.searchLoading&&!ui.searchDone&&(
                <div style={css.searchEmpty}>Recherche en cours...</div>
              )}
              {ui.searchResults.map((ev,i)=>(
                <button key={ev.id||i} type="button" className="srch-item" style={css.searchItem}
                  onMouseDown={e=>{e.preventDefault();goToResult(ev);}}>
                  <span style={css.searchDot(cc(ev.cat))}/>
                  <span style={css.searchItemInfo}>
                    <span style={css.searchItemTitle}>{ev.title}</span>
                    <span style={css.searchItemDate}>{ev.date_label}</span>
                    <span style={css.searchItemDesc}>{ev.desc}</span>
                    {ev.relevance&&<span style={css.searchItemRel}>↳ {ev.relevance}</span>}
                  </span>
                  <span style={css.searchItemNav}>→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={css.sidebarSection}>
        <div style={css.sectionTitle}>Grandes ères</div>
        <div style={css.epochGrid} aria-label="Epoques">
          {EPOCHS.map(ep=>(
            <button key={ep.label} type="button" style={css.epochButton(ep)} onClick={()=>navigateToEpoch(ep)}>
              <span style={css.epochDot(ep.stripe)}/>
              <span>{ep.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={css.sidebarSection}>
        <div style={css.sectionTitle}>Périodes géologiques</div>
        <div style={css.periodGrid} aria-label="Périodes géologiques">
          {PERIODS.map(per=>(
            <button key={per.label} type="button"
              style={css.periodPill(per)}
              onClick={()=>navigateToEpoch({from:per.from,to:per.to})}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="none"}>
              {per.label}
            </button>
          ))}
        </div>
      </div>

      <div style={css.sidebarFooter}>
        <button style={css.sidebarAction} type="button" onClick={()=>setUi(u=>({...u,showBookmarksView:!u.showBookmarksView,legendOpen:false}))}>Signets</button>
        <button style={css.sidebarAction} type="button" onClick={()=>setUi(u=>({...u,legendOpen:!u.legendOpen,showBookmarksView:false}))}>Légende</button>
      </div>
    </aside>
  );
}
