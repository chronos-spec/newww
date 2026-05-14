import { css } from "../styles.js";

export function StatusBar({ ui }) {
  return (
    <div style={css.statusbar}>
      <div style={css.statusEpoch}>{ui.epochLabel}</div>
      <div style={css.aiBadge(ui.aiVisible)}><div style={css.aiDot}/><span>{ui.aiLabel}</span></div>
      <div style={css.statusR}>{ui.range}</div>
    </div>
  );
}
