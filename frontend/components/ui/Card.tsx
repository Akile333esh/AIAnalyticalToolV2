import { ReactNode } from "react";
import clsx from "clsx";

interface CardProps {
  className?: string;
  children: ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow",
        className
      )}
    >
      {children}
    </div>
  );
}
