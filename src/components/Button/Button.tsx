import React, { type ButtonHTMLAttributes, type ReactNode } from "react";
import "./Button.css";

export type ButtonVariant =
  | "detail"
  | "primary"
  | "edit"
  | "warning"
  | "danger"
  | "secondary";

export type ButtonSize = "compact" | "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}) => {
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const fullWidthClass = fullWidth ? "btn-full-width" : "";

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${fullWidthClass} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : icon ? (
        <span className="btn-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children && <span>{children}</span>}
      {!loading && iconRight && (
        <span className="btn-icon" aria-hidden="true">
          {iconRight}
        </span>
      )}
    </button>
  );
};

export default Button;
