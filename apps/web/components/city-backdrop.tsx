// A whitened, cartoon-flat Dhaka street backdrop — a tiled skyline, a
// cycle-rickshaw, and a CNG auto-rickshaw, drawn as one authored SVG
// pattern. Washed near-white so it reads as ambient texture behind the
// "CNG meter" foreground, never competing with text contrast (all shapes
// sit far below the 4.5:1 floor the copy needs, by design).
export function CityBackdrop() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <pattern
          id="dhaka-street"
          width={260}
          height={170}
          patternUnits="userSpaceOnUse"
        >
          <rect width={260} height={170} fill="#FFFFFF" />

          {/* skyline */}
          <g fill="#EEF4F0">
            <rect x={4} y={50} width={26} height={90} />
            <rect x={34} y={30} width={20} height={110} />
            <rect x={58} y={64} width={30} height={76} />
            <rect x={150} y={40} width={24} height={100} />
            <rect x={178} y={58} width={20} height={82} />
            <rect x={202} y={22} width={26} height={118} />
            <rect x={232} y={70} width={22} height={70} />
          </g>
          <g fill="#E2ECE5">
            <rect x={9} y={58} width={6} height={6} />
            <rect x={20} y={58} width={6} height={6} />
            <rect x={9} y={72} width={6} height={6} />
            <rect x={20} y={72} width={6} height={6} />
            <rect x={207} y={32} width={6} height={6} />
            <rect x={218} y={32} width={6} height={6} />
            <rect x={207} y={46} width={6} height={6} />
            <rect x={218} y={46} width={6} height={6} />
          </g>

          {/* street line */}
          <rect x={0} y={140} width={260} height={2} fill="#E2ECE5" />

          {/* cycle-rickshaw silhouette */}
          <g transform="translate(30,118)" stroke="#DCE7E0" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20 Q2 4 20 4 Q34 4 34 16" />
            <path d="M2 20 L46 20" />
            <path d="M34 16 L46 20" />
            <circle cx={10} cy={24} r={6} />
            <circle cx={40} cy={24} r={6} />
            <path d="M46 20 L58 4" />
          </g>

          {/* CNG auto-rickshaw silhouette */}
          <g transform="translate(160,112)" stroke="#DCE7E0" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 26 L2 12 Q2 6 10 6 L34 6 Q42 6 42 14 L42 26" />
            <path d="M2 26 L46 26" />
            <path d="M10 6 L10 18 L30 18" />
            <circle cx={12} cy={30} r={5.5} />
            <circle cx={36} cy={30} r={5.5} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dhaka-street)" />
    </svg>
  );
}
