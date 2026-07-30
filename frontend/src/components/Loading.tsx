import clsx from 'clsx';

export interface LoadingProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ label = '加载中…', className, size = 'md' }: LoadingProps) {
  const dotSize = size === 'sm' ? 'h-1.5 w-1.5' : size === 'lg' ? 'h-3 w-3' : 'h-2 w-2';
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 py-8', className)}>
      <div className="flex items-center gap-1.5">
        <span className={clsx('animate-bounce rounded-full bg-brand-500', dotSize)} style={{ animationDelay: '0ms' }} />
        <span className={clsx('animate-bounce rounded-full bg-brand-500', dotSize)} style={{ animationDelay: '120ms' }} />
        <span className={clsx('animate-bounce rounded-full bg-brand-500', dotSize)} style={{ animationDelay: '240ms' }} />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
