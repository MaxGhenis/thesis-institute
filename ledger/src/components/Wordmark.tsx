/**
 * CHRONICLE wordmark — the O drawn as a clock at the letterform's exact size.
 *
 * Static render of the master construction
 * (constellation-design/identities/chronicle/wordmark.svg, measured from
 * Jost Medium 500 at 1000/em): letters typeset, tracked 60/1000 em; the
 * clock replaces the O's slot — ring outer diameter 713 (the O's measured
 * optical height) resting on the baseline, centered in the O's advance
 * (803); stroke 88 = 0.088 em, round caps; hands from center, clockwise
 * from 12 — hour 255° at 0.52 r, minute 180° at 0.78 r: 8:30, when the
 * numbers drop. The operator is drawn, never typed.
 *
 * Ink binds to the theme (text-primary / horizon-700) so the mark re-inks
 * with the light and dark registers.
 */
export function Wordmark({ height = 22 }: { height?: number }) {
  const width = height * (6162 / 818);
  return (
    <svg
      viewBox="-24 -759 6162 818"
      width={width}
      height={height}
      role="img"
      aria-label="CHRONICLE"
      focusable="false"
    >
      <g
        fill="var(--color-text-primary)"
        fontFamily="Jost, 'Century Gothic', 'Avenir Next', Futura, sans-serif"
        fontSize="1000"
        fontWeight="500"
      >
        <text x="0" y="0">
          C
        </text>
        <text x="751" y="0">
          H
        </text>
        <text x="1555" y="0">
          R
        </text>
        <text x="3073" y="0">
          N
        </text>
        <text x="3916" y="0">
          I
        </text>
        <text x="4251" y="0">
          C
        </text>
        <text x="5002" y="0">
          L
        </text>
        <text x="5543" y="0">
          E
        </text>
      </g>
      <g
        stroke="var(--color-horizon-700)"
        fill="none"
        strokeWidth="88"
        strokeLinecap="round"
      >
        <circle cx="2611.5" cy="-356.5" r="312.5" />
        <line x1="2611.5" y1="-356.5" x2="2454.54" y2="-314.44" />
        <line x1="2611.5" y1="-356.5" x2="2611.5" y2="-112.75" />
      </g>
    </svg>
  );
}
