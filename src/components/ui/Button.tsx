import React from "react";
import clsx from "clsx";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "icon"
  | "ghost"
  | "default"
  | "cta";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
}

const base =
  "inline-flex items-center justify-center font-medium transition-all active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<ButtonVariant, string> = {
  primary:
    "px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800",
  secondary:
    "px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700",
  danger:
    "p-1 bg-red-500 text-white rounded-full hover:bg-red-600",
  icon:
    "p-1 text-gray-400 text-gray-500 hover:text-red-400 rounded-full",
  ghost:
    "text-gray-400 text-gray-500 hover:text-gray-300",
  default:
    "px-4 py-2 rounded-lg",
  cta:
    "px-8 py-4 text-lg font-unbounded bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-black shadow-lg border-2 border-yellow-400 hover:from-yellow-500 hover:to-yellow-700 hover:border-yellow-500 focus:ring-yellow-400 focus:ring-2 focus:ring-offset-2 focus:ring-offset-black rounded-xl",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(base, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";

export default Button;
