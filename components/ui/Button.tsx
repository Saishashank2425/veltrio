import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

const buttonVariants = {
  primary:
    "bg-gold text-navy font-semibold hover:bg-gold-light active:bg-gold-dark shadow-sm hover:shadow transition-all",
  secondary:
    "border border-gold text-gold hover:bg-gold hover:text-navy font-semibold transition-all",
  ghost:
    "text-ivory/80 hover:text-ivory underline-offset-4 hover:underline transition-colors",
  outline:
    "border border-gold text-gold hover:bg-gold hover:text-navy font-semibold transition-all",
}

const buttonSizes = {
  sm: "px-4 py-2 text-sm rounded-md",
  md: "px-6 py-3 text-sm rounded-lg",
  lg: "px-8 py-4 text-base rounded-lg",
  "icon-sm": "size-7 rounded-md",
}

type ButtonVariant = keyof typeof buttonVariants
type ButtonSize = keyof typeof buttonSizes

type ButtonProps = Omit<ButtonPrimitive.Props, "className"> & {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => (
    <ButtonPrimitive
      ref={ref}
      data-slot="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 cursor-pointer select-none",
        "focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-3",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    />
  )
)

Button.displayName = "Button"
