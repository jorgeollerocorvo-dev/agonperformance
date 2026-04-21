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
        "rounded-3xl bg-white border border-[var(--border)] shadow-[0_1px_2px_rgba(17,17,17,0.04)]",
        padded && "p-5 sm:p-6",
        hover && "transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(17,17,17,0.06)]",
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
        <div className="w-10 h-10 rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)] grid place-items-center">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wider text-[var(--ink-muted)]">{label}</div>
        <div className="text-3xl font-bold leading-tight mt-0.5">{value}</div>
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
  color?: "soft" | "primary" | "ink" | "blue" | "success";
  className?: string;
}) {
  const colors: Record<string, string> = {
    soft: "bg-[var(--surface-2)] text-[var(--ink)]",
    primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
    ink: "bg-[var(--ink)] text-white",
    blue: "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200",
    success: "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200",
  };
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", colors[color], className)}>
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
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const variants: Record<string, string> = {
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
    ghost: "text-[var(--ink)] hover:bg-[var(--surface-2)]",
    outline: "border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-2)]",
    danger: "bg-[var(--danger)] text-white hover:opacity-90",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5",
  };
  return (
    <button
      className={clsx("inline-flex items-center justify-center rounded-full font-medium transition disabled:opacity-60", variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
