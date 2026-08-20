import { useEffect, useState, useRef } from "react";
import { Zap, Award, Flame, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EventData {
  type: "FOUR" | "SIX" | "WICKET";
  text?: string;
  timestamp: number;
}

interface EventAnimationOverlayProps {
  event?: EventData | null;
  onDismiss?: () => void;
}

export function EventAnimationOverlay({ event, onDismiss }: EventAnimationOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [activeEvent, setActiveEvent] = useState<EventData | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!event || !event.timestamp) return;

    // Only trigger if this is a fresh event (timestamp changed and occurred in the last 15 seconds)
    const isNew = event.timestamp !== lastTimestampRef.current;
    const isRecent = Date.now() - event.timestamp < 15000;

    if (isNew && isRecent) {
      lastTimestampRef.current = event.timestamp;
      setActiveEvent(event);
      setVisible(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 4200);
    }
  }, [event, onDismiss]);

  const handleClose = () => {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    onDismiss?.();
  };

  if (!visible || !activeEvent) return null;

  const { type, text } = activeEvent;

  return (
    <div
      role="dialog"
      aria-label="Live Match Event Notification"
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4 bg-black/40 backdrop-blur-[3px] animate-in fade-in zoom-in-95 duration-300"
    >
      <div className="relative pointer-events-auto max-w-sm sm:max-w-md w-full mx-auto">
        {/* WICKET ANIMATION */}
        {type === "WICKET" && (
          <div className="relative overflow-hidden rounded-3xl border-2 border-rose-500/80 bg-gradient-to-b from-rose-950/95 via-zinc-950/95 to-black/95 p-6 sm:p-8 text-center shadow-2xl shadow-rose-900/60 ring-4 ring-rose-500/30 animate-bounce">
            {/* Background glowing aura */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-600/40 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-600/40 rounded-full blur-3xl pointer-events-none animate-pulse" />

            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 right-3 text-rose-300 hover:text-white p-1.5 rounded-full hover:bg-rose-500/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-600/20 border-2 border-rose-500 shadow-lg shadow-rose-600/40 animate-pulse">
                <Flame className="h-9 w-9 text-rose-500" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black tracking-widest uppercase text-rose-400">
                  FALL OF WICKET
                </p>
                <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]">
                  OUT! 🔴
                </h2>
              </div>

              <p className="text-sm font-semibold text-rose-200/90 pt-1">
                {text || "Major breakthrough! The batsman is dismissed!"}
              </p>
            </div>
          </div>
        )}

        {/* FOUR ANIMATION */}
        {type === "FOUR" && (
          <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/80 bg-gradient-to-b from-emerald-950/95 via-zinc-950/95 to-black/95 p-6 sm:p-8 text-center shadow-2xl shadow-emerald-900/60 ring-4 ring-emerald-500/30 animate-pulse">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-600/40 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-lime-600/40 rounded-full blur-3xl pointer-events-none animate-pulse" />

            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 right-3 text-emerald-300 hover:text-white p-1.5 rounded-full hover:bg-emerald-500/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-600/20 border-2 border-emerald-500 shadow-lg shadow-emerald-600/40 animate-bounce">
                <span className="text-3xl font-black text-emerald-400">4</span>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black tracking-widest uppercase text-emerald-400">
                  CRACKING BOUNDARY
                </p>
                <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]">
                  FOUR! 🏏
                </h2>
              </div>

              <p className="text-sm font-semibold text-emerald-200/90 pt-1">
                {text || "Pierces the infield and races away to the boundary ropes!"}
              </p>
            </div>
          </div>
        )}

        {/* SIX ANIMATION */}
        {type === "SIX" && (
          <div className="relative overflow-hidden rounded-3xl border-2 border-purple-500/80 bg-gradient-to-b from-purple-950/95 via-zinc-950/95 to-black/95 p-6 sm:p-8 text-center shadow-2xl shadow-purple-900/60 ring-4 ring-purple-500/30 animate-pulse">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/50 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/40 rounded-full blur-3xl pointer-events-none animate-pulse" />

            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 right-3 text-purple-300 hover:text-white p-1.5 rounded-full hover:bg-purple-500/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 border-2 border-purple-400 shadow-xl shadow-purple-600/50 animate-bounce">
                <span className="text-3xl font-black text-white">6</span>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black tracking-widest uppercase text-amber-300 flex items-center justify-center gap-1">
                  <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> MAXIMUM BLAST
                </p>
                <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-purple-200 to-pink-300 uppercase drop-shadow-[0_0_25px_rgba(168,85,247,0.9)]">
                  SIX! 🚀
                </h2>
              </div>

              <p className="text-sm font-semibold text-purple-200/90 pt-1">
                {text || "Clean strike sailing high into the stands for a huge maximum!"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
