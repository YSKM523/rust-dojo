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
      <div className="panel-grid pointer-events-none absolute inset-0 -z-10" />
      <div className="panel-veil pointer-events-none absolute inset-0 -z-10" />
      <div className={`flex min-h-[calc(100svh-138px)] w-full ${innerClassName}`}>
        {children}
      </div>
    </section>
  );
}
