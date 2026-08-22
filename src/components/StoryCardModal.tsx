import { useState, useRef } from "react";
import { toPng, toBlob } from "html-to-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamBadge } from "@/components/TeamBadge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ballsToOversText, formatMatchDateTime } from "@/lib/cricket";
import { useQuery } from "@tanstack/react-query";
import { getPlayers } from "@/lib/queries";
import type { Match, Innings, Team, Player, BattingScore, BowlingScore } from "@/lib/firestore";
import {
  Download,
  Share2,
  Copy,
  Trophy,
  Zap,
  Target,
  Award,
  Sparkles,
  Check,
  Flame,
  Camera,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export type StoryCardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match?: Match | null;
  teamA?: Team | null;
  teamB?: Team | null;
  inn1?: (Innings & { batting?: BattingScore[]; bowling?: BowlingScore[] }) | null;
  inn2?: (Innings & { batting?: BattingScore[]; bowling?: BowlingScore[] }) | null;
  playerOfMatch?: Player | null;
  allPlayers?: Player[];
  // For individual player card sharing:
  playerData?: {
    player: Player;
    team: Team | null;
    batting: { runs: number; highestScore: number; strikeRate: number; average: number | null; fours: number; sixes: number };
    bowling: { wickets: number; bestFigures: string; economy: number };
    matchesCount: number;
    potmCount: number;
  } | null;
};

type CardTemplate = "match-result" | "potm" | "big-moment" | "player-profile";
type AspectRatio = "story" | "square";

export function StoryCardModal({
  open,
  onOpenChange,
  match,
  teamA,
  teamB,
  inn1,
  inn2,
  playerOfMatch,
  allPlayers = [],
  playerData,
}: StoryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<CardTemplate>(
    playerData ? "player-profile" : match?.resultText ? "match-result" : "potm"
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("story");
  const [momentType, setMomentType] = useState<"six" | "wicket" | "fifty" | "win">("six");
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: fetchedPlayers = [] } = useQuery({
    queryKey: ["players"],
    queryFn: getPlayers,
    enabled: open,
  });

  const getTeamName = (teamId?: string | null) => {
    if (teamId === teamA?.id) return teamA?.name ?? "Team A";
    if (teamId === teamB?.id) return teamB?.name ?? "Team B";
    return "Team";
  };

  const getPlayerName = (id?: string | null, fallback?: string) => {
    if (!id) return fallback ?? "Player";
    return fullPlayersList.find((p) => p.id === id)?.name ?? fallback ?? "Player";
  };

  const getPlayerPhoto = (id?: string | null) => {
    if (!id) return null;
    return fullPlayersList.find((p) => p.id === id)?.photoUrl ?? null;
  };

  // Top performers from Innings 1 and Innings 2
  const topBatters = [
    ...(inn1?.batting ?? []),
    ...(inn2?.batting ?? []),
  ].sort((a, b) => b.runs - a.runs);
  const bestBatter = topBatters[0] ?? null;

  const topBowlers = [
    ...(inn1?.bowling ?? []),
    ...(inn2?.bowling ?? []),
  ].filter((b) => b.balls > 0).sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);
  const bestBowler = topBowlers[0] ?? null;

  // Fully resolved POTM player object (with photoUrl, name, teamId, role)
  const resolvedPotm =
    playerOfMatch ??
    (match?.playerOfMatchId
      ? fullPlayersList.find((p) => p.id === match.playerOfMatchId)
      : null) ??
    (bestBatter?.playerId
      ? fullPlayersList.find((p) => p.id === bestBatter.playerId)
      : null) ??
    (bestBowler?.playerId
      ? fullPlayersList.find((p) => p.id === bestBowler.playerId)
      : null);

  const potmName = resolvedPotm?.name ?? bestBatter?.playerName ?? "Player of the Match";
  const potmPhoto = resolvedPotm?.photoUrl ?? null;
  const potmRole = resolvedPotm?.role ? resolvedPotm.role.replace("_", " ") : "Match Winner";
  const potmTeam = resolvedPotm?.teamId ? getTeamName(resolvedPotm.teamId) : null;

  // POTM match stats
  const potmBatting = [
    ...(inn1?.batting ?? []),
    ...(inn2?.batting ?? []),
  ].find((b) => b.playerId === resolvedPotm?.id);

  const potmBowling = [
    ...(inn1?.bowling ?? []),
    ...(inn2?.bowling ?? []),
  ].find((b) => b.playerId === resolvedPotm?.id && (b.balls > 0 || b.wickets > 0 || b.runs > 0));

  const generateImage = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    try {
      return await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        quality: 0.98,
      });
    } catch (err) {
      console.error("Failed to generate image:", err);
      return null;
    }
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await generateImage();
      if (!dataUrl) {
        toast.error("Failed to generate story card image.");
        return;
      }
      const link = document.createElement("a");
      link.download = `wasa-cricket-${template}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Story card image downloaded!");
    } catch {
      toast.error("Error saving image.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const blob = await toBlob(cardRef.current, { pixelRatio: 2.5 });
      if (!blob) {
        toast.error("Could not copy image.");
        return;
      }
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopied(true);
      toast.success("Copied story image to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: download if clipboard item API not supported
      await handleDownload();
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const blob = await toBlob(cardRef.current, { pixelRatio: 2.5 });
      if (!blob) {
        toast.error("Could not prepare share image.");
        return;
      }
      const file = new File([blob], `wasa-cricket-${template}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "WASA Premier League Match Highlight",
          text: match?.resultText ?? "Check out this WASA Premier League cricket highlight!",
          files: [file],
        });
        toast.success("Shared successfully!");
      } else {
        await handleDownload();
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        await handleDownload();
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b bg-muted/20 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                <Camera className="h-5 w-5 text-amber-500" />
                <span>Story & Highlight Card Generator</span>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] uppercase font-bold">
                  Instagram • WhatsApp • Status
                </Badge>
              </DialogTitle>
            </div>

            {/* Aspect Ratio Switcher */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border">
              <button
                type="button"
                onClick={() => setAspectRatio("story")}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                  aspectRatio === "story"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📱 Story (9:16)
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio("square")}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                  aspectRatio === "square"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🔲 Post (1:1)
              </button>
            </div>
          </div>

          {/* Template Selector Chips */}
          <div className="flex flex-wrap gap-2 mt-3 pt-1 border-t border-border/50">
            {match && (
              <button
                type="button"
                onClick={() => setTemplate("match-result")}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  template === "match-result"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Trophy className="h-3.5 w-3.5" /> Match Result
              </button>
            )}

            {(playerOfMatch || bestBatter || bestBowler) && (
              <button
                type="button"
                onClick={() => setTemplate("potm")}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  template === "potm"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Award className="h-3.5 w-3.5" /> Player of Match
              </button>
            )}

            {match && (
              <button
                type="button"
                onClick={() => setTemplate("big-moment")}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  template === "big-moment"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Flame className="h-3.5 w-3.5" /> Big Moment
              </button>
            )}

            {playerData && (
              <button
                type="button"
                onClick={() => setTemplate("player-profile")}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  template === "player-profile"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" /> Player Spotlight
              </button>
            )}

            {/* Moment Sub-Selector if big-moment selected */}
            {template === "big-moment" && (
              <div className="flex items-center gap-1 ml-auto">
                {(["six", "wicket", "fifty", "win"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMomentType(m)}
                    className={`text-[11px] uppercase font-mono px-2 py-1 rounded ${
                      momentType === m
                        ? "bg-emerald-500 text-white font-black"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {m === "six" ? "💥 6" : m === "wicket" ? "🎯 Wkt" : m === "fifty" ? "🏏 50" : "🏆 Win"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Live Card Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/40 flex items-center justify-center">
          <div
            ref={cardRef}
            style={{
              width: aspectRatio === "story" ? "380px" : "420px",
              minHeight: aspectRatio === "story" ? "675px" : "420px",
            }}
            className="relative flex flex-col justify-between p-6 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white border-2 border-emerald-500/30 shadow-2xl overflow-hidden select-none font-sans"
          >
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header (Brand Bar) */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
                  <Trophy className="h-4 w-4 text-amber-300" />
                </span>
                <div>
                  <h4 className="font-black text-xs sm:text-sm tracking-tight leading-none uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-amber-300">
                    WASA PREMIER LEAGUE
                  </h4>
                  <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                    Indoor Championship • Lahore
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                OFFICIAL
              </span>
            </div>

            {/* TEMPLATE 1: MATCH RESULT CARD */}
            {template === "match-result" && match && (
              <div className="relative z-10 my-auto py-4 space-y-4 text-center">
                {/* Match Stage & Timing */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-white/10 text-[10px] font-bold text-slate-300">
                  <span>{match.stage === "FINAL" ? "🏆 GRAND FINAL" : `MATCH #${match.matchNumber}`}</span>
                  <span>•</span>
                  <span>{formatMatchDateTime(match.day, match.date, match.time)}</span>
                </div>

                {/* Score vs Score Showdown */}
                <div className="grid grid-cols-2 gap-3 items-center pt-2">
                  {/* Team A */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 flex flex-col items-center space-y-2">
                    <TeamBadge
                      shortName={teamA?.shortName ?? "TBD"}
                      logoUrl={teamA?.logoUrl}
                      size="lg"
                      className="ring-2 ring-emerald-400/40"
                    />
                    <span className="font-extrabold text-sm text-slate-100 truncate max-w-[130px]">
                      {teamA?.name ?? "Team A"}
                    </span>
                    {inn1 && (
                      <div className="font-mono">
                        <span className="text-xl sm:text-2xl font-black text-amber-400">
                          {inn1.runs}/{Math.min(5, inn1.wickets)}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          ({ballsToOversText(inn1.balls)} ov)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Team B */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 flex flex-col items-center space-y-2">
                    <TeamBadge
                      shortName={teamB?.shortName ?? "TBD"}
                      logoUrl={teamB?.logoUrl}
                      size="lg"
                      className="ring-2 ring-sky-400/40"
                    />
                    <span className="font-extrabold text-sm text-slate-100 truncate max-w-[130px]">
                      {teamB?.name ?? "Team B"}
                    </span>
                    {inn2 && (
                      <div className="font-mono">
                        <span className="text-xl sm:text-2xl font-black text-sky-400">
                          {inn2.runs}/{Math.min(5, inn2.wickets)}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          ({ballsToOversText(inn2.balls)} ov)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Grand Result Banner */}
                {match.resultText ? (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-emerald-500/20 border border-amber-400/40 shadow-lg space-y-1">
                    <span className="text-[10px] font-black tracking-widest uppercase text-amber-300 block">
                      ⚡ MATCH WINNER ⚡
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                      {match.resultText}
                    </h3>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 text-xs font-mono text-amber-400">
                    MATCH IN PROGRESS
                  </div>
                )}

                {/* Top Bat & Top Bowl Micro Summary with Avatars */}
                <div className="grid grid-cols-2 gap-2 text-left text-xs pt-1">
                  {bestBatter && (
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-amber-500/20 flex items-center gap-2.5">
                      <PlayerAvatar
                        name={getPlayerName(bestBatter.playerId, bestBatter.playerName)}
                        photoUrl={getPlayerPhoto(bestBatter.playerId)}
                        size="sm"
                        className="ring-1 ring-amber-400/50 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] text-amber-400 uppercase font-black block truncate">🏏 Top Batter</span>
                        <p className="font-bold text-slate-100 truncate mt-0.5">
                          {getPlayerName(bestBatter.playerId, bestBatter.playerName)}
                        </p>
                        <span className="text-[11px] font-mono font-bold text-amber-300">
                          {bestBatter.runs} ({bestBatter.balls}b)
                        </span>
                      </div>
                    </div>
                  )}

                  {bestBowler && (
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-sky-500/20 flex items-center gap-2.5">
                      <PlayerAvatar
                        name={getPlayerName(bestBowler.playerId, bestBowler.playerName)}
                        photoUrl={getPlayerPhoto(bestBowler.playerId)}
                        size="sm"
                        className="ring-1 ring-sky-400/50 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] text-sky-400 uppercase font-black block truncate">🎯 Top Bowler</span>
                        <p className="font-bold text-slate-100 truncate mt-0.5">
                          {getPlayerName(bestBowler.playerId, bestBowler.playerName)}
                        </p>
                        <span className="text-[11px] font-mono font-bold text-sky-300">
                          {bestBowler.wickets}/{bestBowler.runs} ({ballsToOversText(bestBowler.balls)} ov)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TEMPLATE 2: PLAYER OF THE MATCH (POTM) CARD */}
            {template === "potm" && (
              <div className="relative z-10 my-auto py-4 text-center space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs tracking-wider uppercase">
                  <Trophy className="h-4 w-4 text-amber-400" /> PLAYER OF THE MATCH
                </div>

                {/* Player Big Avatar with Glowing Rings */}
                <div className="relative inline-block my-2">
                  <PlayerAvatar
                    name={potmName}
                    photoUrl={potmPhoto}
                    size="2xl"
                    className="border-4 border-amber-400 ring-8 ring-amber-400/20 shadow-2xl mx-auto"
                  />
                  <span className="absolute -bottom-2 right-2 bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full border border-white shadow-md">
                    ★ MVP
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight text-white uppercase">
                    {potmName}
                  </h3>
                  <p className="text-xs font-bold text-emerald-400">
                    {potmRole} {potmTeam ? `• ${potmTeam}` : ""}
                  </p>
                </div>

                {/* Performance Pill Grid */}
                <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/30 text-left">
                    <span className="text-[10px] text-slate-400 block font-sans">BATTING</span>
                    {potmBatting ? (
                      <div>
                        <span className="text-lg font-black text-amber-400">
                          {potmBatting.runs}
                          {potmBatting.isOut ? "" : "*"}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          ({potmBatting.balls}b, {potmBatting.fours}x4, {potmBatting.sixes}x6)
                        </span>
                      </div>
                    ) : bestBatter ? (
                      <div>
                        <span className="text-lg font-black text-amber-400">
                          {bestBatter.runs}
                          {bestBatter.isOut ? "" : "*"}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          ({bestBatter.balls} balls)
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Did not bat</span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-sky-500/30 text-left">
                    <span className="text-[10px] text-slate-400 block font-sans">BOWLING</span>
                    {potmBowling ? (
                      <div>
                        <span className="text-lg font-black text-sky-400">
                          {potmBowling.wickets}/{potmBowling.runs}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          ({ballsToOversText(potmBowling.balls)} overs)
                        </span>
                      </div>
                    ) : bestBowler ? (
                      <div>
                        <span className="text-lg font-black text-sky-400">
                          {bestBowler.wickets}/{bestBowler.runs}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          ({ballsToOversText(bestBowler.balls)} overs)
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Did not bowl</span>
                    )}
                  </div>
                </div>

                {match?.resultText && (
                  <p className="text-xs font-semibold text-slate-300 italic">
                    "{match.resultText}"
                  </p>
                )}
              </div>
            )}

            {/* TEMPLATE 3: BIG MOMENT CARD (SIX / WICKET / FIFTY) */}
            {template === "big-moment" && (
              <div className="relative z-10 my-auto py-6 text-center space-y-4">
                <div className="inline-block">
                  <span className="text-3xl sm:text-4xl font-black italic tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-rose-400 to-amber-200 drop-shadow-md">
                    {momentType === "six" && "💥 MAXIMUM 6! 💥"}
                    {momentType === "wicket" && "🎯 TIMBER! WICKET! 🎯"}
                    {momentType === "fifty" && "🏏 SMASHING 50! 🏏"}
                    {momentType === "win" && "🏆 VICTORY MOMENT 🏆"}
                  </span>
                </div>

                <p className="text-sm font-extrabold text-emerald-300 uppercase tracking-wider">
                  WASA PREMIER LEAGUE 2026
                </p>

                {/* Focus Player Card */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/15 space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <PlayerAvatar
                      name={
                        momentType === "wicket"
                          ? getPlayerName(bestBowler?.playerId, bestBowler?.playerName ?? "Bowler")
                          : getPlayerName(bestBatter?.playerId, bestBatter?.playerName ?? "Batter")
                      }
                      photoUrl={
                        momentType === "wicket"
                          ? getPlayerPhoto(bestBowler?.playerId)
                          : getPlayerPhoto(bestBatter?.playerId)
                      }
                      size="lg"
                      className="ring-2 ring-amber-400 shadow-md"
                    />
                    <div className="text-left">
                      <span className="font-extrabold text-base text-white block">
                        {momentType === "wicket"
                          ? getPlayerName(bestBowler?.playerId, bestBowler?.playerName)
                          : getPlayerName(bestBatter?.playerId, bestBatter?.playerName)}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {momentType === "wicket"
                          ? `Spell: ${bestBowler?.wickets ?? 1} Wickets (${bestBowler?.runs ?? 0} runs)`
                          : `Score: ${bestBatter?.runs ?? 30} Runs (${bestBatter?.balls ?? 15}b)`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-200">
                  ⚡ HIGH VOLTAGE INDOOR CRICKET ⚡
                </div>
              </div>
            )}

            {/* TEMPLATE 4: PLAYER SPOTLIGHT PROFILE CARD */}
            {template === "player-profile" && playerData && (
              <div className="relative z-10 my-auto py-4 text-center space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs tracking-wider uppercase">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> TOURNAMENT SPOTLIGHT
                </div>

                <div className="relative inline-block my-2">
                  <PlayerAvatar
                    name={playerData.player.name}
                    photoUrl={playerData.player.photoUrl}
                    size="2xl"
                    className="border-4 border-emerald-400 ring-8 ring-emerald-500/20 shadow-2xl mx-auto"
                  />
                  {playerData.player.jerseyNumber && (
                    <span className="absolute -bottom-1 -right-1 bg-slate-900 text-amber-400 font-mono font-black text-xs px-2 py-0.5 rounded-full border border-amber-400 shadow-sm">
                      #{playerData.player.jerseyNumber}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight text-white uppercase">
                    {playerData.player.name}
                  </h3>
                  <p className="text-xs font-bold text-amber-400">
                    {playerData.team?.name ?? "WASA Team"} • {playerData.player.role ? playerData.player.role.replace("_", " ") : "All-Rounder"}
                  </p>
                </div>

                {/* 4-Cell Key Metric Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-left">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/30">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">Total Runs</span>
                    <span className="text-xl font-black text-amber-400">{playerData.batting.runs}</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      HS: {playerData.batting.highestScore} · SR: {playerData.batting.strikeRate.toFixed(1)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-sky-500/30">
                    <span className="text-[10px] text-slate-400 uppercase block font-sans">Total Wickets</span>
                    <span className="text-xl font-black text-sky-400">{playerData.bowling.wickets}</span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Best: {playerData.bowling.bestFigures} · Econ: {playerData.bowling.economy.toFixed(2)}
                    </span>
                  </div>
                </div>

                {playerData.potmCount > 0 && (
                  <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-amber-400" />
                    <span>{playerData.potmCount}x Player of the Match Awards</span>
                  </div>
                )}
              </div>
            )}

            {/* Card Footer (Branding & Hashtags) */}
            <div className="relative z-10 border-t border-white/10 pt-3 flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-mono font-bold text-emerald-400">#WASACricket2026</span>
              <span className="font-medium text-slate-300">officers.wasa.gov.pk</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 sm:p-5 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Auto-formatted for Instagram Stories (9:16) & WhatsApp Status.
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={isExporting}
              className="gap-1.5 text-xs font-bold"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "Copied!" : "Copy Image"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={isExporting}
              className="gap-1.5 text-xs font-bold"
            >
              <Share2 className="h-4 w-4 text-sky-500" />
              <span>Share</span>
            </Button>

            <Button
              size="sm"
              onClick={handleDownload}
              disabled={isExporting}
              className="gap-1.5 text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:from-emerald-500 hover:to-teal-500"
            >
              <Download className="h-4 w-4 text-amber-300" />
              <span>{isExporting ? "Generating..." : "Download High-Res PNG"}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
