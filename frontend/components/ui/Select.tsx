"use client";

import { SelectHTMLAttributes } from "react";
import clsx from "clsx";

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select
      className={clsx(
        "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand",
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
