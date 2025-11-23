"use client";

import { InputHTMLAttributes } from "react";
import clsx from "clsx";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={clsx(
        "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand",
        className
      )}
      {...rest}
    />
  );
}
