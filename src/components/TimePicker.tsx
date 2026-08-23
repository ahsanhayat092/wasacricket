import * as React from "react";
import { Clock, ChevronLeft, ChevronRight, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function parseCustomTime(timeStr?: string | null): {
  hour: number;
  minute: number;
  period: "AM" | "PM";
} {
  if (!timeStr || !timeStr.trim()) {
    return { hour: 9, minute: 0, period: "PM" };
  }

  const str = timeStr.trim().toUpperCase();
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const p = (match12[3]?.toUpperCase() as "AM" | "PM") || "PM";
    if (h === 0) h = 12;
    if (h > 12) h = h % 12 || 12;
    return { hour: h, minute: isNaN(m) ? 0 : m % 60, period: p };
  }

  const matchHourOnly = str.match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (matchHourOnly) {
    let h = parseInt(matchHourOnly[1], 10);
    const p = (matchHourOnly[2]?.toUpperCase() as "AM" | "PM") || "PM";
    if (h === 0) h = 12;
    if (h > 12) h = h % 12 || 12;
    return { hour: h, minute: 0, period: p };
  }

  return { hour: 9, minute: 0, period: "PM" };
}

export function formatTimeOutput(hour: number, minute: number, period: "AM" | "PM"): string {
  const mStr = minute.toString().padStart(2, "0");
  return `${hour}:${mStr} ${period}`;
}

const PRESET_TIMES = [
  "7:00 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
  "9:15 PM",
  "9:45 PM",
  "10:00 PM",
  "10:30 PM",
  "11:00 PM",
  "11:15 PM",
  "12:00 AM",
];

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

  const [hour, setHour] = React.useState<number>(parsed.hour);
  const [minute, setMinute] = React.useState<number>(parsed.minute);
  const [period, setPeriod] = React.useState<"AM" | "PM">(parsed.period);
  const [mode, setMode] = React.useState<"hour" | "minute">("hour");
  const [isDragging, setIsDragging] = React.useState(false);

  const clockRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const p = parseCustomTime(time);
    setHour(p.hour);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [time]);

  const updateTime = (newH: number, newM: number, newP: "AM" | "PM") => {
    setHour(newH);
    setMinute(newM);
    setPeriod(newP);
    onChange(formatTimeOutput(newH, newM, newP));
  };

  // Clock angle calculation from mouse/touch event
  const handlePointerMath = (e: React.PointerEvent<HTMLDivElement> | MouseEvent | TouchEvent) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Angle in degrees from 12 o'clock (top is 0 deg, clockwise)
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    if (mode === "hour") {
      // 12 hours: each hour = 30 deg
      let selectedH = Math.round(deg / 30);
      if (selectedH === 0) selectedH = 12;
      if (selectedH > 12) selectedH = 12;
      updateTime(selectedH, minute, period);
    } else {
      // 60 minutes: each minute = 6 deg
      let selectedM = Math.round(deg / 6);
      if (selectedM === 60) selectedM = 0;
      updateTime(hour, selectedM, period);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handlePointerMath(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      handlePointerMath(e);
    }
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // If was selecting hour, auto-switch to minute view for quick Android flow
      if (mode === "hour") {
        setMode("minute");
      }
    }
  };

  // Step minute helper
  const adjustMinute = (delta: number) => {
    let newM = (minute + delta) % 60;
    if (newM < 0) newM += 60;
    updateTime(hour, newM, period);
  };

  // Step hour helper
  const adjustHour = (delta: number) => {
    let newH = hour + delta;
    if (newH > 12) newH = 1;
    if (newH < 1) newH = 12;
    updateTime(newH, minute, period);
  };

  // Angle for hand rendering
  const activeAngle =
    mode === "hour" ? (hour % 12) * 30 : minute * 6;

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

      <PopoverContent
        className="w-[300px] sm:w-[320px] p-0 z-50 bg-card border shadow-2xl rounded-2xl overflow-hidden"
        align="start"
      >
        {/* Android Material Time Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-zinc-950 p-4 border-b border-border/40 text-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-400" /> SELECT TIME
            </span>
            <div className="flex rounded-lg border border-emerald-500/30 bg-emerald-950/50 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => updateTime(hour, minute, "AM")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                  period === "AM"
                    ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                    : "text-emerald-300 hover:text-white"
                )}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => updateTime(hour, minute, "PM")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                  period === "PM"
                    ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                    : "text-emerald-300 hover:text-white"
                )}
              >
                PM
              </button>
            </div>
          </div>

          {/* Big Android Digital Display */}
          <div className="flex items-center justify-center gap-2 font-mono">
            <button
              type="button"
              onClick={() => setMode("hour")}
              className={cn(
                "text-4xl sm:text-5xl font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer",
                mode === "hour"
                  ? "bg-emerald-500/25 text-emerald-300 border-2 border-emerald-500 shadow-lg shadow-emerald-950"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {hour.toString().padStart(2, "0")}
            </button>

            <span className="text-3xl font-black text-emerald-500 animate-pulse">:</span>

            <button
              type="button"
              onClick={() => setMode("minute")}
              className={cn(
                "text-4xl sm:text-5xl font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer",
                mode === "minute"
                  ? "bg-emerald-500/25 text-emerald-300 border-2 border-emerald-500 shadow-lg shadow-emerald-950"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {minute.toString().padStart(2, "0")}
            </button>
          </div>
        </div>

        {/* Dial & Controls Body */}
        <div className="p-4 space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/40 rounded-xl border">
            <button
              type="button"
              onClick={() => setMode("hour")}
              className={cn(
                "py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer",
                mode === "hour"
                  ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Hour ({hour})
            </button>
            <button
              type="button"
              onClick={() => setMode("minute")}
              className={cn(
                "py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer",
                mode === "minute"
                  ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Minute ({minute.toString().padStart(2, "0")})
            </button>
          </div>

          {/* Android Circular Clock Dial */}
          <div className="flex justify-center select-none py-1">
            <div
              ref={clockRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative w-[210px] h-[210px] rounded-full bg-slate-950/90 border-2 border-emerald-500/30 shadow-inner flex items-center justify-center cursor-pointer touch-none"
            >
              {/* Center Hub */}
              <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-400 z-20 shadow-md ring-2 ring-emerald-500/50" />

              {/* Hand Pointer Line & Circle */}
              <div
                className="absolute inset-0 pointer-events-none transition-transform duration-75 origin-center"
                style={{ transform: `rotate(${activeAngle}deg)` }}
              >
                {/* Pointer Line */}
                <div className="absolute top-7 left-1/2 -translate-x-1/2 w-0.5 h-[76px] bg-emerald-500 shadow-sm" />
                {/* Pointer Tip Selection Circle */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-emerald-500/40 border-2 border-emerald-400 shadow-lg shadow-emerald-500/40 flex items-center justify-center" />
              </div>

              {/* Clock Numbers */}
              {mode === "hour" ? (
                // 1 to 12 Hours
                [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => {
                  const angle = (h % 12) * 30 - 90; // degrees from 3 o'clock
                  const rad = (angle * Math.PI) / 180;
                  const radius = 76; // px from center
                  const x = Math.round(105 + radius * Math.cos(rad));
                  const y = Math.round(105 + radius * Math.sin(rad));

                  const isSelected = hour === h;

                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTime(h, minute, period);
                        setMode("minute");
                      }}
                      className={cn(
                        "absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full text-xs font-bold font-mono transition-transform duration-100 flex items-center justify-center z-10",
                        isSelected
                          ? "text-slate-950 font-black scale-110"
                          : "text-slate-300 hover:text-white"
                      )}
                      style={{ left: `${x}px`, top: `${y}px` }}
                    >
                      {h}
                    </button>
                  );
                })
              ) : (
                // Minutes: Display major 5-min intervals (00, 05, 10... 55)
                [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => {
                  const angle = m * 6 - 90;
                  const rad = (angle * Math.PI) / 180;
                  const radius = 76;
                  const x = Math.round(105 + radius * Math.cos(rad));
                  const y = Math.round(105 + radius * Math.sin(rad));

                  const isSelected = minute === m;

                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTime(hour, m, period);
                      }}
                      className={cn(
                        "absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full text-[11px] font-bold font-mono transition-transform duration-100 flex items-center justify-center z-10",
                        isSelected
                          ? "text-slate-950 font-black scale-110"
                          : "text-slate-300 hover:text-white"
                      )}
                      style={{ left: `${x}px`, top: `${y}px` }}
                    >
                      {m.toString().padStart(2, "0")}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Precision Minute Slider & Steppers (Allows EVERY minute 0-59) */}
          <div className="p-2.5 rounded-xl border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-muted-foreground">Fine-Tune Minute:</span>
              <span className="font-mono font-black text-amber-400 text-sm">
                :{minute.toString().padStart(2, "0")}
              </span>
            </div>

            {/* Slider to select ANY minute 0 to 59 */}
            <input
              type="range"
              min="0"
              max="59"
              value={minute}
              onChange={(e) => updateTime(hour, parseInt(e.target.value, 10) || 0, period)}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-muted rounded-lg"
            />

            <div className="flex items-center justify-between gap-1 pt-1">
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustMinute(-5)}
                  className="h-7 text-[10px] px-2 font-mono font-bold"
                >
                  -5m
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustMinute(-1)}
                  className="h-7 text-[10px] px-2 font-mono font-bold"
                >
                  -1m
                </Button>
              </div>

              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustMinute(1)}
                  className="h-7 text-[10px] px-2 font-mono font-bold"
                >
                  +1m
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustMinute(5)}
                  className="h-7 text-[10px] px-2 font-mono font-bold"
                >
                  +5m
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Quick Match Times
            </span>
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
              {PRESET_TIMES.map((preset) => {
                const isCurrent = time === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      const p = parseCustomTime(preset);
                      updateTime(p.hour, p.minute, p.period);
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer",
                      isCurrent
                        ? "bg-amber-500/20 border-amber-500 text-amber-300"
                        : "bg-muted/30 hover:bg-muted text-muted-foreground border-border/40"
                    )}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            size="sm"
            className="w-full h-9 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-1.5 shadow-md"
            onClick={() => setOpen(false)}
          >
            <Check className="h-4 w-4" /> Done ({formatTimeOutput(hour, minute, period)})
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
