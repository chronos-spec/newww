import { css } from "../styles.js";

const CARDS = [
  {
    title: "Univers",
    kicker: "13,8 Ga",
    text: "Big Bang, étoiles, galaxies",
    color: "#7c5cf0",
    bg: "#f0edff",
    range: { from: 13.8e9, to: 4.6e9 },
  },
  {
    title: "Terre",
    kicker: "4,6 Ga",
    text: "Océans, continents, atmosphère",
    color: "#0878c8",
    bg: "#eaf6ff",
    range: { from: 4.6e9, to: 541e6 },
  },
  {
    title: "Vie",
    kicker: "3,5 Ga",
    text: "Cellules, plantes, animaux",
    color: "#16a34a",
    bg: "#eaf8ee",
    range: { from: 3.8e9, to: 252e6 },
  },
  {
    title: "Dinosaures",
    kicker: "230 Ma",
    text: "Mésozoïque et extinctions",
    color: "#c86010",
    bg: "#fff1e4",
    range: { from: 252e6, to: 66e6 },
  },
  {
    title: "Humanité",
    kicker: "300 Ka",
    text: "Homo sapiens, art, agriculture",
    color: "#c02828",
    bg: "#fff0f0",
    range: { from: 2.6e6, to: 12e3 },
  },
  {
    title: "Civilisations",
    kicker: "12 Ka",
    text: "Écriture, empires, sciences",
    color: "#1850cc",
    bg: "#edf3ff",
    range: { from: 12e3, to: 0 },
  },
];

export function ExploreCards({ navigateToEpoch }) {
  return (
    <section className="chronos-explore" style={css.exploreGrid} aria-label="Accès rapides">
      {CARDS.map(card=>(
        <button
          key={card.title}
          type="button"
          style={css.exploreCard(card)}
          onClick={()=>navigateToEpoch(card.range)}
        >
          <span style={css.exploreIcon(card.color)}>{card.title.slice(0,1)}</span>
          <span style={css.exploreContent}>
            <span style={css.exploreKicker}>{card.kicker}</span>
            <span style={css.exploreTitle}>{card.title}</span>
            <span style={css.exploreText}>{card.text}</span>
          </span>
        </button>
      ))}
    </section>
  );
}
