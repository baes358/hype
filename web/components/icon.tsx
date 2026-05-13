type IconDef = {
  w: number;
  h: number;
  mode: "stroke" | "fill";
  paths: readonly string[];
};

const ICONS = {
  "upright-arrow": {
    w: 9,
    h: 10,
    mode: "stroke",
    paths: ["M0.561632 8.52051L7.42562 0.75M7.42562 8.52051V0.75L0.561523 0.75"],
  },
  "left-arrow": {
    w: 12,
    h: 12,
    mode: "stroke",
    paths: ["M11.427 5.68793L1.05911 5.72563M6.86415 0.560127L1.05911 5.72563L5.62207 10.8535"],
  },
  "right-arrow": {
    w: 12,
    h: 12,
    mode: "stroke",
    paths: ["M0.0026575 5.66461L10.3706 5.62691M4.56554 10.7924L10.3706 5.62691L5.80762 0.499023"],
  },
  "up-arrow": {
    w: 12,
    h: 12,
    mode: "stroke",
    paths: ["M5.58818 11.4257L5.67412 1.05808M10.77 6.9243L5.67412 1.05808L0.492188 5.55957"],
  },
  "down-arrow": {
    w: 12,
    h: 12,
    mode: "stroke",
    paths: ["M5.74775 0.00592829L5.66182 10.3736M0.565904 4.50734L5.66182 10.3736L10.8437 5.87207"],
  },
  reset: {
    w: 12,
    h: 15,
    mode: "stroke",
    paths: [
      "M5.61878 8.66509C5.61878 8.66509 3.30157 7.27761 0.993999 5.91353C2.21273 3.57592 6.43496 2.16541 9.04273 4.35555C11.2493 6.20875 11.734 9.29566 9.68168 11.7406C7.2717 14.6117 3.48123 13.4803 2.24752 12.4446M0.993999 5.91353C2.53821 3.30124 4.27829 0.384608 4.27829 0.384608",
    ],
  },
  return: {
    w: 14,
    h: 8,
    mode: "stroke",
    paths: ["M12.4992 0.858253C12.5001 2.01183 12.5014 3.81216 12.5014 3.81216L1.06051 3.80835M4.33855 0.530304L1.06051 3.80835L4.33855 7.0864"],
  },
  bullet: {
    w: 8,
    h: 14,
    mode: "fill",
    paths: ["M3.66699 0L7.33398 10.6544L3.66695 13.5885L0 10.6544L3.66699 0Z"],
  },
} as const satisfies Record<string, IconDef>;

type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  className?: string;
  /** Display size in pixels (height); width scales proportionally. */
  size?: number;
  /** Override the icon's color. Defaults to `currentColor` so the icon
      inherits its parent's text color. */
  color?: string;
};

export function Icon({ name, className, size, color }: Props) {
  const def = ICONS[name];
  const height = size ?? def.h;
  const width = (height / def.h) * def.w;
  const tint = color ?? "currentColor";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${def.w} ${def.h}`}
      fill="none"
      aria-hidden
      className={className}
      style={{ width, height }}
    >
      {def.paths.map((d, i) =>
        def.mode === "fill" ? (
          <path key={i} d={d} fill={tint} />
        ) : (
          <path key={i} d={d} stroke={tint} strokeWidth={1.5} />
        ),
      )}
    </svg>
  );
}
