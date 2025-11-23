"use client";

import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "default",
  loading,
  children,
  disabled,
  ...rest
}: Props) {
  const base =
    "inline-flex items-center justify-center rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants: Record<string, string> = {
    primary: "bg-brand text-slate-950 hover:bg-brand-dark",
    secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700",
    ghost: "bg-transparent text-slate-100 hover:bg-slate-800",
    danger: "bg-red-600 text-white hover:bg-red-700",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
  };

  const sizes: Record<string, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10"
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
      )}
      {children}
    </button>
  );
}
