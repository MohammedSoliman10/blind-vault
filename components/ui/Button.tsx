"use client";

import React from "react";
import { cx } from "./cx";

export type ButtonVariant =
  | "primary"
  | "accent"
  | "outline"
  | "danger"
  | "ink"
  | "ink-outline"
  | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

// Literal class names so Tailwind keeps them.
const VARIANT: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  accent: "btn-accent",
  outline: "btn-outline",
  danger: "btn-danger",
  ink: "btn-ink",
  "ink-outline": "btn-ink-outline",
  ghost: "btn-ghost",
};
const SIZE: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string
) {
  return cx("btn", VARIANT[variant], SIZE[size], extra);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  fullWidth = false,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, cx(fullWidth && "w-full whitespace-normal text-center", className))}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
      {iconRight && <span className="inline-flex shrink-0">{iconRight}</span>}
    </button>
  );
}

export default Button;
