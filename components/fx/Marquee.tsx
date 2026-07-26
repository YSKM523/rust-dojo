interface MarqueeProps {
  items: string[];
  className?: string;
}

/** JD 关键词跑马灯：内容双份 + track 位移 50% 无缝循环（纯 CSS，服务端组件）。 */
export function Marquee({ items, className = '' }: MarqueeProps) {
  const row = (ariaHidden: boolean) => (
    <span aria-hidden={ariaHidden} className="inline-flex items-center">
      {items.map((item) => (
        <span
          key={`${ariaHidden}-${item}`}
          className="mx-6 inline-flex items-center gap-6 font-mono text-xs font-bold uppercase tracking-[0.3em] text-fg3"
        >
          {item}
          <span aria-hidden className="inline-block h-1 w-1 bg-brand" />
        </span>
      ))}
    </span>
  );

  return (
    <div className={`fx-marquee border-y border-line py-3 ${className}`}>
      <div className="fx-marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
