"use client"

import * as React from "react"
import { CircleChevronLeft, CircleChevronRight, ChevronDown } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

/**
 * Shadcn-style Calendar wrapping react-day-picker (v10 API).
 * - Range selection renders as a continuous accent band: middle cells share
 *   the same bg color, start/end are capped with the darker primary button.
 * - Nav icons are intentionally distinct from the chevrons used by Select /
 *   Dropdown elsewhere in the admin UI.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "flex flex-col gap-4",
        month_caption: "relative flex items-center justify-center h-9 text-sm font-medium",
        // pointer-events-none is important when caption_label is rendered
        // inside dropdown_root — the native <select> is overlaid on top via
        // absolute positioning, and any clicks would otherwise be eaten by
        // this label span before reaching the select beneath.
        caption_label: "inline-flex items-center gap-1 text-sm font-medium select-none pointer-events-none",
        // Dropdown caption layout — month + year selects.
        // dropdown_root: relative wrapper holding the (invisible) <select> and
        //                the visible label span.
        // dropdown:      the native <select>, made transparent and positioned
        //                over the label so it captures clicks. z-10 keeps it
        //                guaranteed above the label regardless of stack order.
        dropdowns: "flex items-center gap-2",
        dropdown_root: "relative inline-flex items-center rounded-md px-2 py-1 hover:bg-accent cursor-pointer",
        dropdown: "absolute inset-0 z-10 opacity-0 cursor-pointer appearance-none",
        // z-10 so the prev/next buttons stack above each Month's MonthCaption
        // (later siblings in the DOM would otherwise block pointer events).
        nav: "absolute inset-x-1 top-0 z-10 flex h-9 items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-[0.8rem] font-normal text-muted-foreground",
        week: "mt-2 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        // Range band — every selected cell shares bg-accent so they read as
        // one continuous block; the corners are rounded only at the ends.
        range_start: "rounded-l-md bg-accent",
        range_middle: "bg-accent",
        range_end: "rounded-r-md bg-accent",
        // Endcap buttons for the range (and single-date selection) — darker
        // primary background over the accent band so the start/end pop.
        selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground [&>button]:focus:bg-primary",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground",
        outside: "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        // Only the orientation prop is used — spreading the rest would put
        // `disabled` and library default class names onto the SVG.
        Chevron: ({ orientation }) => {
          if (orientation === "left") return <CircleChevronLeft className="h-5 w-5" strokeWidth={1.75} />
          if (orientation === "right") return <CircleChevronRight className="h-5 w-5" strokeWidth={1.75} />
          if (orientation === "down") return <ChevronDown className="h-4 w-4 opacity-60" />
          return null
        },
        // Native <select> inside a Radix DropdownMenuContent is normally
        // killed because the menu treats pointer-down on form controls as an
        // outside interaction and closes itself before the OS picker opens.
        // Stopping propagation on the picker-opening events lets the select
        // behave like a plain form control again.
        Select: (props) => (
          <select
            {...props}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          />
        ),
      }}
      {...props}
    />
  )
}

export { Calendar }
