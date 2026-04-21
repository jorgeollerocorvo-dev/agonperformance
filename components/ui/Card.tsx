import { clsx } from "./clsx";

export function Card({
  className,
  children,
  hover,
  padded = true,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  padded?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl bg-[var(--surface)] border border-[var(--border)]",
        "shadow-[var(--shadow-sm)]",
        padded && "p-5 sm:p-6",
        hover && "transition hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  trailing,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  trailing?: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <Card hover={!!href} className="flex items-center gap-4">
      {icon && (
        <div className="w-11 h-11 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] grid place-items-center">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">{label}</div>
        <div className="text-3xl font-bold leading-tight mt-0.5 display">{value}</div>
        {trailing && <div className="text-xs text-[var(--ink-muted)] mt-1">{trailing}</div>}
      </div>
    </Card>
  );
  return href ? <a href={href} className="block">{inner}</a> : inner;
}

export function Pill({
  children,
  color = "soft",
  className,
}: {
  children: React.ReactNode;
  color?: "soft" | "primary" | "ink" | "blue" | "success" | "danger";
  className?: string;
}) {
  const colors: Record<string, string> = {
    soft: "bg-[var(--surface-2)] text-[var(--ink)]",
    primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
    ink: "bg-[var(--ink)] text-[var(--bg)]",
    blue: "bg-[var(--primary-soft)] text-[var(--primary)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  };
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", colors[color], className)}>
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ink" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const variants: Record<string, string> = {
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
    ink: "bg-[var(--ink)] text-[var(--bg)] hover:opacity-90",
    ghost: "text-[var(--ink)] hover:bg-[var(--surface-2)]",
    outline: "border border-[var(--border-strong)] text-[var(--ink)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
    danger: "bg-[var(--danger)] text-white hover:opacity-90",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3",
  };
  return (
    <button
      className={clsx("inline-flex items-center justify-center rounded-full font-semibold transition disabled:opacity-60", variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * Gradient accent card (for special hero areas — blue → purple, like a Revolut card).
 */
export function AccentCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-2xl p-6 text-white overflow-hidden relative",
        "bg-gradient-to-br from-[var(--primary)] via-[var(--accent-purple)] to-[var(--accent-pink)]",
        "shadow-[var(--shadow-lg)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
