import React, { useMemo, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { subscribeToBroadcastMatch } from "@/lib/queries";
import { ballsToOversText, runRate, requiredRunRate } from "@/lib/cricket";
import type { BattingScore, BowlingScore } from "@/lib/firestore";

export default function BroadcastOverlay() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const theme = searchParams.get("theme") || "tv_classic"; // 'tv_classic' | 'ticker' | 'scorebox'

  const [data, setData] = useState<any | null>(null);

  // Real-time Firestore stream listener (sub-100ms instant updates)
  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToBroadcastMatch(id, (liveWorkspace) => {
      if (liveWorkspace) {
        setData(liveWorkspace);
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, [id]);

  const match = data?.match;
  const teams = data?.teams ?? [];
  const players = data?.players ?? [];
  const innings = data?.innings ?? [];

  const teamA = useMemo(() => teams.find((t) => t.id === match?.teamAId), [teams, match?.teamAId]);
  const teamB = useMemo(() => teams.find((t) => t.id === match?.teamBId), [teams, match?.teamBId]);

  // Determine current active innings
  const currentInnings = useMemo(() => {
    if (!innings || innings.length === 0) return null;
    // If inn2 has started or is completed, show inn2, else inn1
    if (innings.length > 1 && (innings[1].runs > 0 || (innings[1].balls && innings[1].balls > 0) || match?.status === "COMPLETED")) {
      return innings[1];
    }
    return innings[0];
  }, [innings, match?.status]);

  const isInnings2 = currentInnings?.inningsNumber === 2;
  const battingTeam = isInnings2
    ? (currentInnings?.battingTeamId === teamA?.id ? teamA : teamB)
    : (currentInnings?.battingTeamId === teamB?.id ? teamB : teamA);

  const maxOvers = match?.oversPerSide ?? 10;
  const maxBalls = maxOvers * 6;
  const totalRuns = currentInnings?.runs ?? 0;
  const totalWickets = currentInnings?.wickets ?? 0;
  const totalBalls = currentInnings?.balls ?? 0;
  const oversFormatted = ballsToOversText(totalBalls);

  const crr = useMemo(() => {
    return runRate(totalRuns, totalBalls).toFixed(2);
  }, [totalRuns, totalBalls]);

  // Target and RRR calculation for Innings 2
  const target = match?.targetRuns ?? (innings[0] ? (innings[0].runs ?? 0) + 1 : 0);
  const runsNeeded = Math.max(0, target - totalRuns);
  const ballsRemaining = Math.max(0, maxBalls - totalBalls);
  const rrr = useMemo(() => {
    if (!isInnings2 || ballsRemaining === 0) return "0.00";
    return requiredRunRate(target, totalRuns, maxBalls, totalBalls).toFixed(2);
  }, [isInnings2, target, totalRuns, maxBalls, totalBalls, ballsRemaining]);

  // Active Batters
  const battingScores = (currentInnings?.batting ?? []) as BattingScore[];
  const activeBatters = useMemo(() => {
    return battingScores.filter((b) => !b.isOut).slice(0, 2);
  }, [battingScores]);

  const striker = activeBatters[0];
  const nonStriker = activeBatters[1];

  const getPlayerName = (pId?: string) => {
    if (!pId) return "Batter";
    const p = players.find((pl) => pl.id === pId);
    return p ? p.name : "Batter";
  };

  // Active Bowler
  const bowlingScores = (currentInnings?.bowling ?? []) as BowlingScore[];
  const currentBowler = useMemo(() => {
    if (bowlingScores.length === 0) return null;
    return bowlingScores[bowlingScores.length - 1];
  }, [bowlingScores]);

  // Recent Balls in current over
  const recentBallsList = useMemo(() => {
    const raw = currentInnings?.recentBalls;
    if (!raw || !Array.isArray(raw)) return [];
    return raw.slice(-6);
  }, [currentInnings?.recentBalls]);

  // Dynamic Event Banner Flash Trigger
  const [eventBanner, setEventBanner] = useState<{ title: string; subtitle: string; color: string } | null>(null);
  const lastBall = recentBallsList[recentBallsList.length - 1];

  useEffect(() => {
    if (!lastBall) return;
    if (lastBall.outcome === "SIX" || lastBall.runs === 6) {
      setEventBanner({ title: "MAXIMUM 6️⃣", subtitle: "MASSIVE HIT OVER THE ROPES!", color: "from-purple-600 to-pink-600" });
    } else if (lastBall.outcome === "FOUR" || lastBall.runs === 4) {
      setEventBanner({ title: "BOUNDARY 4️⃣", subtitle: "CRACKING SHOT TO THE FENCE!", color: "from-blue-600 to-cyan-500" });
    } else if (lastBall.outcome === "WICKET" || lastBall.isWicket) {
      setEventBanner({ title: "WICKET! 🎯", subtitle: "TIMBER! HUGE BREAKTHROUGH!", color: "from-rose-600 to-red-700" });
    }

    const timer = setTimeout(() => {
      setEventBanner(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [lastBall?.timestamp, lastBall?.outcome, lastBall?.runs]);

  if (!match) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-end justify-center p-8">
        <div className="bg-black/80 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-pulse">
          Connecting to Live Cricket Broadcast Stream...
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Theme 2: Minimalist Ticker (Bottom 60px)
  // --------------------------------------------------------------------------
  if (theme === "ticker") {
    return (
      <div className="w-screen h-screen bg-transparent flex flex-col justify-end p-4 pointer-events-none select-none font-sans overflow-hidden">
        <div className="w-full max-w-7xl mx-auto rounded-2xl bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl text-white flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-black tracking-widest text-red-400 uppercase">LIVE</span>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div className="flex items-center gap-3">
              <span className="text-lg font-black tracking-tight text-amber-400">{battingTeam?.name ?? "Team"}</span>
              <span className="text-2xl font-black">{totalRuns}/{totalWickets}</span>
              <span className="text-sm font-bold text-white/70">({oversFormatted} / {maxOvers} ov)</span>
            </div>
          </div>

          {isInnings2 && (
            <div className="flex items-center gap-4 text-xs font-bold text-emerald-400">
              <span>Target: {target}</span>
              <span>Need {runsNeeded} in {ballsRemaining}b</span>
              <span>RRR: {rrr}</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs">
            {striker && (
              <span className="font-bold text-white">
                🏏 {getPlayerName(striker.playerId)} <strong className="text-amber-300">{striker.runs}</strong> ({striker.balls}b)
              </span>
            )}
            {currentBowler && (
              <span className="text-white/80 font-medium">
                🎯 {getPlayerName(currentBowler.playerId)}: {ballsToOversText(currentBowler.balls || 0)}-{currentBowler.maidens || 0}-{currentBowler.runs || 0}-{currentBowler.wickets || 0}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Theme 3: Compact Top-Left Scorebox
  // --------------------------------------------------------------------------
  if (theme === "scorebox") {
    return (
      <div className="w-screen h-screen bg-transparent p-6 pointer-events-none select-none font-sans overflow-hidden">
        <div className="w-80 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl text-white p-4 space-y-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black tracking-widest text-red-400 uppercase">LIVE MATCH</span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground">{match.stage === "FINAL" ? "🏆 FINAL" : `MATCH #${match.matchNumber}`}</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-base font-black text-amber-400 truncate max-w-[120px]">{battingTeam?.name}</span>
            <div className="text-right">
              <div className="text-2xl font-black leading-none">{totalRuns}/{totalWickets}</div>
              <div className="text-[11px] font-bold text-white/70">({oversFormatted} / {maxOvers} ov)</div>
            </div>
          </div>

          {isInnings2 && (
            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-2.5 py-1 text-center text-[10px] font-black text-emerald-300">
              Need {runsNeeded} runs in {ballsRemaining} balls (RRR {rrr})
            </div>
          )}

          <div className="border-t border-white/10 pt-2 space-y-1 text-xs">
            {striker && (
              <div className="flex justify-between text-white font-bold">
                <span className="truncate">🏏 {getPlayerName(striker.playerId)}</span>
                <span className="text-amber-300">{striker.runs} ({striker.balls})</span>
              </div>
            )}
            {currentBowler && (
              <div className="flex justify-between text-[11px] text-white/70">
                <span className="truncate">🎯 {getPlayerName(currentBowler.playerId)}</span>
                <span>{currentBowler.wickets}/{currentBowler.runs}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Theme 1: Professional TV Lower-Third (Default 1920x1080)
  // --------------------------------------------------------------------------
  return (
    <div className="w-screen h-screen bg-transparent flex flex-col justify-end p-8 pointer-events-none select-none font-sans overflow-hidden">
      {/* 1. Dynamic Milestone Flash Event Pop-up */}
      {eventBanner && (
        <div className="mb-4 self-center animate-in fade-in zoom-in-95 duration-300">
          <div className={`px-12 py-4 rounded-3xl bg-gradient-to-r ${eventBanner.color} border-2 border-white/80 shadow-[0_0_50px_rgba(255,255,255,0.4)] text-center text-white flex flex-col items-center gap-1`}>
            <span className="text-4xl sm:text-5xl font-black tracking-wider uppercase drop-shadow-lg">
              {eventBanner.title}
            </span>
            <span className="text-xs sm:text-sm font-bold tracking-widest uppercase text-white/90">
              {eventBanner.subtitle}
            </span>
          </div>
        </div>
      )}

      {/* 2. Main TV Lower-Third Container */}
      <div className="w-full max-w-6xl mx-auto space-y-2">
        {/* Match Situation Context Sub-Banner */}
        <div className="flex items-center justify-between px-6 py-1.5 rounded-t-2xl bg-black/80 backdrop-blur-md border-t border-x border-white/20 text-xs font-bold text-white shadow-lg">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black tracking-widest animate-pulse uppercase">
              LIVE
            </span>
            <span className="text-amber-400 font-extrabold tracking-wide uppercase">
              {match.stage === "FINAL" ? "🏆 GRAND FINAL" : match.stage === "PLAYOFF" ? "⚔️ PLAYOFF MATCH" : `LEAGUE MATCH #${match.matchNumber}`}
            </span>
            <span className="text-white/40">·</span>
            <span className="text-white/80">{match.venue || "Askari XI Ground, Lahore"}</span>
          </div>

          <div className="flex items-center gap-4">
            {isInnings2 ? (
              <span className="text-emerald-400 font-black tracking-wide">
                Target: {target} · Need <strong className="text-white">{runsNeeded}</strong> off <strong className="text-white">{ballsRemaining}b</strong> (RRR: {rrr})
              </span>
            ) : (
              <span className="text-white/80 font-medium">
                1st Innings · CRR: <strong className="text-amber-300">{crr}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Primary Broadcast Scoreboard Bar */}
        <div className="rounded-b-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-black/95 backdrop-blur-2xl border border-white/25 shadow-2xl p-4 text-white grid grid-cols-12 gap-4 items-center">
          {/* Batting Team & Big Score (Cols 1-4) */}
          <div className="col-span-4 flex items-center gap-4 border-r border-white/15 pr-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-black text-2xl shadow-xl shrink-0 border border-white/30">
              {battingTeam?.name?.charAt(0) ?? "T"}
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xl font-black tracking-tight text-amber-400 uppercase leading-none truncate max-w-[170px]">
                {battingTeam?.name ?? "Batting Team"}
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tighter text-white">
                  {totalRuns}<span className="text-2xl text-white/60">/{totalWickets}</span>
                </span>
                <span className="text-sm font-bold text-white/70">
                  ({oversFormatted}/{maxOvers} ov)
                </span>
              </div>
            </div>
          </div>

          {/* Active Batsmen (Cols 5-8) */}
          <div className="col-span-4 border-r border-white/15 pr-4 space-y-1.5">
            {/* Striker */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                <span className="text-amber-400 font-bold">🏏</span>
                <span className="font-black text-white truncate text-sm">
                  {getPlayerName(striker?.playerId)}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-base font-black text-amber-300">
                  {striker?.runs ?? 0}
                </span>
                <span className="text-xs text-white/60 font-bold">
                  ({striker?.balls ?? 0}b · {striker?.fours ?? 0}x4 {striker?.sixes ?? 0}x6)
                </span>
              </div>
            </div>

            {/* Non-Striker */}
            <div className="flex items-center justify-between text-xs text-white/80">
              <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                <span className="text-white/40">·</span>
                <span className="font-semibold text-white/90 truncate">
                  {getPlayerName(nonStriker?.playerId)}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-sm font-bold text-white">
                  {nonStriker?.runs ?? 0}
                </span>
                <span className="text-xs text-white/50">
                  ({nonStriker?.balls ?? 0}b)
                </span>
              </div>
            </div>
          </div>

          {/* Active Bowler & This Over Balls (Cols 9-12) */}
          <div className="col-span-4 space-y-1.5 pl-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                <span className="text-emerald-400">🎯</span>
                <span className="font-bold text-white truncate">
                  {getPlayerName(currentBowler?.playerId)}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-300">
                {currentBowler ? `${ballsToOversText(currentBowler.balls || 0)}-${currentBowler.maidens || 0}-${currentBowler.runs || 0}-${currentBowler.wickets || 0}` : "0-0-0-0"}
              </span>
            </div>

            {/* Ball-by-Ball Circles for Current Over */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/50 mr-1">THIS OVER:</span>
              {recentBallsList.length === 0 ? (
                <span className="text-[11px] text-white/40 font-mono italic">Starting over...</span>
              ) : (
                recentBallsList.map((b, idx) => {
                  const isWicket = b.outcome === "WICKET" || b.isWicket;
                  const isSix = b.outcome === "SIX" || b.runs === 6;
                  const isFour = b.outcome === "FOUR" || b.runs === 4;
                  const isExtra = b.extras && b.extras > 0;

                  return (
                    <span
                      key={idx}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono shadow-md ${
                        isWicket
                          ? "bg-rose-600 text-white shadow-rose-600/50"
                          : isSix
                          ? "bg-purple-600 text-white shadow-purple-600/50"
                          : isFour
                          ? "bg-blue-600 text-white shadow-blue-600/50"
                          : isExtra
                          ? "bg-amber-500 text-black shadow-amber-500/50"
                          : b.runs === 0
                          ? "bg-white/10 text-white/60 border border-white/20"
                          : "bg-emerald-600 text-white shadow-emerald-600/50"
                      }`}
                    >
                      {isWicket ? "W" : isSix ? "6" : isFour ? "4" : b.runs}
                    </span>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
