"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { normalizeNumberInput } from "@/lib/number-input"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, onFocus, onBlur, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
        onChange={event => {
          if (type === "number") {
            const normalized = normalizeNumberInput(event.currentTarget.value)
            if (normalized !== event.currentTarget.value) event.currentTarget.value = normalized
          }
          onChange?.(event)
        }}
        onFocus={event => {
          if (type === "number" && event.currentTarget.value === "0") event.currentTarget.select()
          onFocus?.(event)
        }}
        onBlur={event => {
          if (type === "number" && event.currentTarget.value !== "" && Number.isFinite(Number(event.currentTarget.value))) {
            event.currentTarget.value = String(Number(event.currentTarget.value))
          }
          onBlur?.(event)
        }}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
