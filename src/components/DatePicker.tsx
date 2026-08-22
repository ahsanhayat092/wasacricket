import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { MatchDay } from "@/lib/firestore";

const DAY_MAP: Record<number, MatchDay> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

export function parseCustomDate(dateStr?: string | null): Date | undefined {
  if (!dateStr || !dateStr.trim()) return undefined;
  const str = dateStr.trim();

  // Try direct Date parse (e.g. ISO format "2026-08-24")
  const direct = new Date(str);
  if (isValid(direct) && !isNaN(direct.getTime())) {
    return direct;
  }

  // Try common custom cricket date formats
  const currentYear = new Date().getFullYear();
  const formats = [
    "d MMMM yyyy",
    "d MMMM",
    "d MMM yyyy",
    "d MMM",
    "yyyy-MM-dd",
    "dd/MM/yyyy",
    "MM/dd/yyyy",
  ];

  for (const fmt of formats) {
    try {
      const parsed = parse(str, fmt, new Date());
      if (isValid(parsed) && !isNaN(parsed.getTime())) {
        if (!fmt.includes("yyyy")) {
          parsed.setFullYear(currentYear);
        }
        return parsed;
      }
    } catch {
      // Continue trying
    }
  }

  return undefined;
}

export function DatePicker({
  date,
  onChange,
  placeholder = "Pick a date",
  className,
  buttonVariant = "outline",
  size = "default",
}: {
  date?: string | null;
  onChange: (formattedDate: string, dayOfWeek?: MatchDay) => void;
  placeholder?: string;
  className?: string;
  buttonVariant?: "outline" | "ghost" | "default" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const [open, setOpen] = React.useState(false);
  const parsedDate = parseCustomDate(date);

  const handleSelect = (selected: Date | undefined) => {
    if (!selected) return;
    const formatted = format(selected, "d MMMM yyyy");
    const dayOfWeek = DAY_MAP[selected.getDay()] ?? "MONDAY";
    onChange(formatted, dayOfWeek);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={buttonVariant}
          size={size}
          className={cn(
            "justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-emerald-500 shrink-0" />
          <span className="truncate">
            {parsedDate ? format(parsedDate, "d MMM yyyy") : date ? date : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
        <Calendar
          mode="single"
          selected={parsedDate}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
