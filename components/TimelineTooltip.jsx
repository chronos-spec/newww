import { css } from "../styles.js";

export function TimelineTooltip({ tooltip }) {
  if (!tooltip) return null;
  return (
    <div style={css.tt(tooltip)} role="tooltip">
      <div style={css.ttDate}>{tooltip.date}</div>
      <div style={css.ttTitle}>{tooltip.title}</div>
      <div style={css.ttHint}>Cliquer pour la fiche complète</div>
    </div>
  );
}
