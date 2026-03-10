import * as React from "react"
import { cn } from "../../utils/analytics" // Simplified utils use for now

const Card = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "rounded-2xl border border-white/10 bg-slate-900/50 text-white shadow-sm glass",
            className
        )}
        {...props}
    />
))
Card.displayName = "Card"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6", className)} {...props} />
))
CardContent.displayName = "CardContent"

export { Card, CardContent }
