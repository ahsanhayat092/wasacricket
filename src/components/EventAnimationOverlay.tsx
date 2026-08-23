import { useEffect, useState, useRef } from "react";
import { Zap, Award, Flame, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EventData {
  type: "FOUR" | "SIX" | "WICKET" | "MAIDEN" | "TOSS";
  text?: string;
  timestamp: number;
  batterName?: string;
  bowlerName?: string;
  dismissal?: string;
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
      }, 4500);
    }
  }, [event, onDismiss]);

  const handleClose = () => {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    onDismiss?.();
  };

  if (!visible || !activeEvent) return null;

  const { type, text } = activeEvent;

  // Smart fallbacks if batterName / bowlerName / dismissal were not passed as top-level keys
  let batterName = activeEvent.batterName?.trim();
  let bowlerName = activeEvent.bowlerName?.trim();
  let dismissal = activeEvent.dismissal?.trim();

  if (!batterName && text) {
    const outMatch = text.match(/^(.+?)\s+(?:is OUT|smashes|launches|hit)/i);
    if (outMatch && outMatch[1]) {
      batterName = outMatch[1].trim();
    }
  }

  if (!bowlerName && text) {
    const bowlMatch = text.match(/off\s+([^!.]+)/i) || text.match(/spell by\s+([^!.]+)/i);
    if (bowlMatch && bowlMatch[1]) {
      bowlerName = bowlMatch[1].trim();
    }
  }

  if (!dismissal && text && type === "WICKET") {
    const disMatch = text.match(/\(([^)]+)\)/);
    if (disMatch && disMatch[1]) {
      dismissal = disMatch[1].trim();
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Live Match Event Notification"
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4 bg-black/45 backdrop-blur-[3px] animate-in fade-in zoom-in-95 duration-300"
    >
      <div className="relative pointer-events-auto max-w-sm sm:max-w-md w-full mx-auto">
        {/* WICKET ANIMATION */}
        {type === "WICKET" && (
          <div className="relative overflow-hidden rounded-3xl border-2 border-rose-500/85 bg-gradient-to-b from-rose-950/95 via-zinc-950/95 to-black/95 p-6 sm:p-7 text-center shadow-2xl shadow-rose-900/70 ring-4 ring-rose-500/30 animate-bounce">
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

            <div className="space-y-3.5">
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

              {/* Batsman Out & Bowler Details Box */}
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-left space-y-2 backdrop-blur-sm shadow-inner">
                <div className="flex items-center justify-between gap-2 border-b border-rose-500/20 pb-1.5">
                  <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">👤 Batsman Out:</span>
                  <span className="text-sm sm:text-base font-black text-white">{batterName || "Batsman"}</span>
                </div>
                {bowlerName && (
                  <div className="flex items-center justify-between gap-2 border-b border-rose-500/20 pb-1.5">
                    <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">🎯 Bowler:</span>
                    <span className="text-xs sm:text-sm font-extrabold text-rose-200">{bowlerName}</span>
                  </div>
                )}
                {dismissal && (
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">⚡ Dismissal:</span>
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wide bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {dismissal}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs font-medium text-rose-200/90 pt-0.5">
                {text || "Major breakthrough! The batsman is dismissed!"}
              </p>
            </div>
          </div>
        )}

        {/* FOUR ANIMATION */}
        {type === "FOUR" && (
          <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/85 bg-gradient-to-b from-emerald-950/95 via-zinc-950/95 to-black/95 p-6 sm:p-7 text-center shadow-2xl shadow-emerald-900/70 ring-4 ring-emerald-500/30 animate-pulse">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-600/40 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-lime-600/40 rounded-full blur-3xl pointer-events-none animate-pulse" />

            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 right-3 text-emerald-300 hover:text-white p-1.5 rounded-full hover:bg-emerald-500/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-3.5">
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

              {/* Batsman Who Hit Four Box */}
              {batterName && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 backdrop-blur-sm shadow-inner text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    🏏 SMASHED BY BATSMAN
                  </p>
                  <p className="text-lg sm:text-xl font-black text-white mt-0.5">
                    {batterName}
                  </p>
                  {bowlerName && (
                    <p className="text-xs font-semibold text-emerald-200/90 mt-1">
                      Off the bowling of {bowlerName}
                    </p>
                  )}
                </div>
              )}

              <p className="text-sm font-semibold text-emerald-200/90 pt-0.5">
                {text || "Pierces the infield and races away to the boundary ropes!"}
              </p>
            </div>
          </div>
        )}

        {/* SIX ANIMATION */}
        {type === "SIX" && (
          <div className="relative overflow-hidden rounded-3xl border-2 border-purple-500/85 bg-gradient-to-b from-purple-950/95 via-zinc-950/95 to-black/95 p-6 sm:p-7 text-center shadow-2xl shadow-purple-900/70 ring-4 ring-purple-500/30 animate-pulse">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-600/50 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/40 rounded-full blur-3xl pointer-events-none animate-pulse" />

            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 right-3 text-purple-300 hover:text-white p-1.5 rounded-full hover:bg-purple-500/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-3.5">
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

              {/* Batsman Who Hit Six Box */}
              {batterName && (
                <div className="p-3.5 rounded-2xl bg-purple-500/15 border border-purple-500/35 backdrop-blur-sm shadow-inner text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    🚀 LAUNCHED BY BATSMAN
                  </p>
                  <p className="text-lg sm:text-xl font-black text-white mt-0.5">
                    {batterName}
                  </p>
                  {bowlerName && (
                    <p className="text-xs font-semibold text-purple-200/90 mt-1">
                      Off the bowling of {bowlerName}
                    </p>
                  )}
                </div>
              )}

              <p className="text-sm font-semibold text-purple-200/90 pt-0.5">
                {text || "Clean strike sailing high into the stands for a huge maximum!"}
              </p>
            </div>
          </div>
        )}

        {/* MAIDEN OVER ANIMATION */}
        {type === "MAIDEN" && (
          <div className="relative overflow-hidden rounded-3xl border-2 border-cyan-500/80 bg-gradient-to-b from-cyan-950/95 via-zinc-950/95 to-black/95 p-6 sm:p-8 text-center shadow-2xl shadow-cyan-900/60 ring-4 ring-cyan-500/30 animate-pulse">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-600/40 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-sky-600/40 rounded-full blur-3xl pointer-events-none animate-pulse" />

            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 right-3 text-cyan-300 hover:text-white p-1.5 rounded-full hover:bg-cyan-500/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-600/20 border-2 border-cyan-400 shadow-xl shadow-cyan-500/40 animate-bounce">
                <span className="text-3xl font-black text-cyan-300">0</span>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black tracking-widest uppercase text-cyan-400">
                  ICE COLD BOWLING • 0 RUNS CONCEDED
                </p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_20px_rgba(6,182,212,0.8)]">
                  MAIDEN OVER! 🎯
                </h2>
              </div>

              <p className="text-sm font-semibold text-cyan-200/90 pt-1">
                {text || "Sensational defense! A complete 0-run maiden over delivered under pressure!"}
              </p>
            </div>
          </div>
        )}

        {/* TOSS ANIMATION */}
        {type === "TOSS" && (
          <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/90 bg-gradient-to-b from-amber-950/95 via-zinc-950/95 to-black/95 p-6 sm:p-8 text-center shadow-2xl shadow-amber-900/70 ring-4 ring-amber-500/30 animate-in zoom-in-95 duration-300">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/40 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/40 rounded-full blur-3xl pointer-events-none animate-pulse" />

            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 right-3 text-amber-300 hover:text-white p-1.5 rounded-full hover:bg-amber-500/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-4">
              {/* Spinning / Pulsing 3D Coin Badge */}
              <div className="relative inline-flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-300 p-1 shadow-2xl shadow-amber-500/50 ring-4 ring-amber-400/40 animate-bounce">
                  <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center border-2 border-amber-300">
                    <span className="text-3xl animate-pulse">🪙</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-black tracking-widest uppercase text-amber-400 flex items-center justify-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-amber-400" /> OFFICIAL TOSS RESULT
                </p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-emerald-300 uppercase drop-shadow-[0_0_25px_rgba(245,158,11,0.8)]">
                  TOSS COMPLETED! ⚡
                </h2>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 backdrop-blur-sm shadow-inner">
                <p className="text-base sm:text-lg font-black text-white leading-snug">
                  {text || "Toss conducted! Match is underway."}
                </p>
              </div>

              <p className="text-[11px] font-mono font-bold text-amber-300/90 uppercase tracking-widest">
                ⚡ INNINGS 1 COMMENCING ⚡
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
