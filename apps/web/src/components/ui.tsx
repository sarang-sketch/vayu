/** Design-system primitives (Material-3-inspired dark theme). */
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-teal-500 text-ink-950 hover:bg-teal-400 focus-visible:ring-teal-300 shadow-glow font-semibold',
  ghost:
    'border border-ink-500/70 bg-ink-700/50 text-mist-100 hover:border-teal-400/60 hover:text-teal-300 focus-visible:ring-teal-400',
  danger: 'bg-red-500/90 text-white hover:bg-red-400 focus-visible:ring-red-300 font-semibold',
};

export function Button({ variant = 'primary', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
        'disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_STYLES[variant],
        className,
      )}
      {...rest}
    />
  );
}

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card p-5', className)} {...rest} />;
}

export function Badge({ color, children }: { color?: string; children: ReactNode }) {
  return (
    <span className="chip">
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color ?? '#2dd4bf' }}
      />
      {children}
    </span>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-mist-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton h-4 w-full', className)} />;
}

export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex items-start gap-3">
      {icon ? <div className="mt-0.5 text-teal-300">{icon}</div> : null}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-mist-500">{label}</p>
        <p className="mt-1 font-display text-2xl font-semibold text-white">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-mist-500">{hint}</p> : null}
      </div>
    </Card>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="text-center">
      <p className="font-display text-lg font-semibold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-mist-500">{body}</p>
    </Card>
  );
}
