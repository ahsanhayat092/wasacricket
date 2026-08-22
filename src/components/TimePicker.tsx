import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = ["00", "15", "30", "45"];
const PRESET_TIMES = [
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
  "9:45 PM",
  "10:30 PM",
  "11:15 PM",
  "12:00 AM",
];

export function parseCustomTime(timeStr?: string | null): {
  hour: number;
  minute: string;
  period: "AM" | "PM";
} {
  if (!timeStr || !timeStr.trim()) {
    return { hour: 9, minute: "00", period: "PM" };
  }

  const str = timeStr.trim().toUpperCase();
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2];
    const p = (match12[3]?.toUpperCase() as "AM" | "PM") || "PM";
    if (h === 0) h = 12;
    if (h > 12) h = h % 12 || 12;
    return { hour: h, minute: m, period: p };
  }

  // Check simple hour e.g. "9 PM"
  const matchHourOnly = str.match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (matchHourOnly) {
    let h = parseInt(matchHourOnly[1], 10);
    const p = (matchHourOnly[2]?.toUpperCase() as "AM" | "PM") || "PM";
    if (h === 0) h = 12;
    if (h > 12) h = h % 12 || 12;
    return { hour: h, minute: "00", period: p };
  }

  return { hour: 9, minute: "00", period: "PM" };
}

export function TimePicker({
  time,
  onChange,
  placeholder = "Select Time",
  className,
  buttonVariant = "outline",
  size = "default",
}: {
  time?: string | null;
  onChange: (formattedTime: string) => void;
  placeholder?: string;
  className?: string;
  buttonVariant?: "outline" | "ghost" | "default" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const [open, setOpen] = React.useState(false);
  const parsed = parseCustomTime(time);

  const [selectedHour, setSelectedHour] = React.useState<number>(parsed.hour);
  const [selectedMinute, setSelectedMinute] = React.useState<string>(parsed.minute);
  const [selectedPeriod, setSelectedPeriod] = React.useState<"AM" | "PM">(parsed.period);

  React.useEffect(() => {
    const p = parseCustomTime(time);
    setSelectedHour(p.hour);
    setSelectedMinute(p.minute);
    setSelectedPeriod(p.period);
  }, [time]);

  const emitTime = (h: number, m: string, p: "AM" | "PM") => {
    setSelectedHour(h);
    setSelectedMinute(m);
    setSelectedPeriod(p);
    onChange(`${h}:${m} ${p}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={buttonVariant}
          size={size}
          className={cn(
            "justify-start text-left font-normal",
            !time && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4 text-amber-500 shrink-0" />
          <span className="truncate">{time || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 z-50 bg-popover space-y-4" align="start">
        {/* Header / Current selection display */}
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-1.5 text-base font-extrabold font-mono text-amber-500">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>
              {selectedHour}:{selectedMinute} {selectedPeriod}
            </span>
          </div>
          <div className="flex rounded-lg border bg-muted/40 p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => emitTime(selectedHour, selectedMinute, "AM")}
              className={cn(
                "px-2 py-1 rounded-md transition-all cursor-pointer",
                selectedPeriod === "AM"
                  ? "bg-amber-500 text-slate-950 shadow-sm font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => emitTime(selectedHour, selectedMinute, "PM")}
              className={cn(
                "px-2 py-1 rounded-md transition-all cursor-pointer",
                selectedPeriod === "PM"
                  ? "bg-amber-500 text-slate-950 shadow-sm font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              PM
            </button>
          </div>
        </div>

        {/* Clock Interactive Selectors */}
        <div className="space-y-3">
          {/* Hours Grid */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Hour
            </span>
            <div className="grid grid-cols-6 gap-1">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => emitTime(h, selectedMinute, selectedPeriod)}
                  className={cn(
                    "h-7 rounded-md text-xs font-bold font-mono transition-colors cursor-pointer",
                    selectedHour === h
                      ? "bg-amber-500 text-slate-950 font-black"
                      : "hover:bg-muted text-foreground border border-border/40"
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Minutes Grid */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Minute
            </span>
            <div className="grid grid-cols-4 gap-1">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => emitTime(selectedHour, m, selectedPeriod)}
                  className={cn(
                    "h-7 rounded-md text-xs font-bold font-mono transition-colors cursor-pointer",
                    selectedMinute === m
                      ? "bg-amber-500 text-slate-950 font-black"
                      : "hover:bg-muted text-foreground border border-border/40"
                  )}
                >
                  :{m}
                </button>
              ))}
            </div>
          </div>

          {/* Preset Fast Selection */}
          <div className="space-y-1.5 pt-1.5 border-t">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Quick Timings
            </span>
            <div className="flex flex-wrap gap-1">
              {PRESET_TIMES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const p = parseCustomTime(preset);
                    emitTime(p.hour, p.minute, p.period);
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-mono font-medium border transition-colors cursor-pointer",
                    time === preset
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-400 font-bold"
                      : "bg-muted/30 hover:bg-muted text-muted-foreground"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button
          size="sm"
          className="w-full h-8 text-xs font-bold"
          onClick={() => setOpen(false)}
        >
          Done
        </Button>
      </PopoverContent>
    </Popover>
  );
}
