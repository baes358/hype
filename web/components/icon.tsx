import Image from "next/image";

const ICONS = {
  "upright-arrow": { w: 9, h: 10 },
  "left-arrow": { w: 12, h: 12 },
  "right-arrow": { w: 12, h: 12 },
  bullet: { w: 8, h: 14 },
} as const;

type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  className?: string;
  /** Display size in pixels (height); width scales proportionally. */
  size?: number;
};

export function Icon({ name, className, size }: Props) {
  const { w, h } = ICONS[name];
  const height = size ?? h;
  const width = (height / h) * w;
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
