import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80",
        outline:
          "border border-input bg-card text-foreground hover:border-primary/40 hover:bg-accent hover:text-accent-foreground active:bg-accent-active",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent-active",
        subtle:
          "bg-primary-soft text-primary-soft-foreground hover:bg-accent active:bg-accent-active",
        danger:
          "bg-danger text-white shadow-sm hover:bg-danger/90 active:bg-danger/80",
        success:
          "bg-success text-white shadow-sm hover:bg-success/90 active:bg-success/80",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 active:text-primary",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
