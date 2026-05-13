import Image from "next/image";

const ICONS = {
  "upright-arrow": { w: 9, h: 10 },
  "left-arrow": { w: 12, h: 12 },
  "right-arrow": { w: 12, h: 12 },
  bullet: { w: 8, h: 14 },
} as const;

type IconName = keyof typeof ICONS;

// Same path data as /public/icons/bullet.svg. Inlined so the fill can be
// parameterized — used when a legend item needs a category color.
const BULLET_PATH =
  "M3.66699 0L7.33398 10.6544L3.66695 13.5885L0 10.6544L3.66699 0Z";

type Props = {
  name: IconName;
  className?: string;
  /** Display size in pixels (height); width scales proportionally. */
  size?: number;
  /** Override the bullet's fill (no-op for arrows). Required for legend
      bullets that carry a category color. */
  color?: string;
};

export function Icon({ name, className, size, color }: Props) {
  const { w, h } = ICONS[name];
  const height = size ?? h;
  const width = (height / h) * w;

  if (name === "bullet" && color) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${w} ${h}`}
        fill="none"
        aria-hidden
        className={className}
        style={{ width, height }}
      >
        <path d={BULLET_PATH} fill={color} />
      </svg>
    );
  }

  return (
    <Image
      src={`/icons/${name}.svg`}
      alt=""
      aria-hidden
      width={width}
      height={height}
      className={className}
      style={{ width, height }}
    />
  );
}
