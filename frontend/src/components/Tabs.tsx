import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ items, value, onChange, className }: TabsProps<T>) {
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-soft dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-ring',
              active
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
