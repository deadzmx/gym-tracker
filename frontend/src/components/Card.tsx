import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  bodyClassName?: string;
  padded?: boolean;
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  padded = true,
  ...rest
}: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
      {...rest}
    >
      {title || actions ? (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <div>
            {title ? (
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={clsx(padded && 'p-5', bodyClassName)}>{children}</div>
    </div>
  );
}
