import type { ReactNode } from 'react';

export function EditorialPanel({
  children,
  className = '',
  innerClassName = '',
  ariaLabelledBy,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  ariaLabelledBy?: string;
}) {
  return (
    <section
      aria-labelledby={ariaLabelledBy}
      className={`relative isolate min-h-[calc(100svh-58px)] overflow-hidden border-b border-line px-4 py-10 sm:px-6 lg:px-8 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:76px_76px] opacity-55" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_18%,rgba(185,90,10,0.12),transparent_28%),linear-gradient(180deg,rgba(5,6,9,0)_0%,rgba(5,6,9,0.34)_100%)]" />
      <div className={`flex min-h-[calc(100svh-138px)] w-full ${innerClassName}`}>
        {children}
      </div>
    </section>
  );
}
