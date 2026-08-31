import React, { useState } from "react";
import { useTeam } from "@/context/TeamContext";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import {
  createTeamChallenge,
  acceptTeamChallenge,
  declineTeamChallenge,
  withdrawTeamChallenge,
} from "@/lib/mutations";
import {
  getTeamChallenges,
  getAvailableOpponentTeams,
  type TeamChallengesGrouped,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/TeamBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Swords,
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Shield,
  Zap,
  KeyRound,
  Copy,
  ExternalLink,
  Flame,
  Search,
} from "lucide-react";
import { Link } from "react-router";
import type { ChallengeType, TournamentFormatType, Team } from "@/lib/firestore";

export default function TeamChallenges() {
  const { user } = useAuth();
  const { activeTeam, teams, isLoading: teamsLoading } = useTeam();

  // Active Tab state
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing" | "active" | "completed">("incoming");

  // New Challenge Modal State
  const [newChallengeModalOpen, setNewChallengeModalOpen] = useState(false);
  const [opponentSearch, setOpponentSearch] = useState("");
  const [selectedOpponent, setSelectedOpponent] = useState<Team | null>(null);
  const [challengeType, setChallengeType] = useState<ChallengeType>("SINGLE");
  const [formatType, setFormatType] = useState<TournamentFormatType>("TAPE_BALL_INDOOR");
  const [oversPerSide, setOversPerSide] = useState("4");
  const [playersPerTeam, setPlayersPerTeam] = useState("6");
  const [venue, setVenue] = useState("Askari XI Ground, Lahore");
  const [proposedDate, setProposedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [proposedTime, setProposedTime] = useState("19:30");
  const [message, setMessage] = useState("");

  // Decline Modal State
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineChallengeId, setDeclineChallengeId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  // Queries
  const { data: challenges, isLoading: challengesLoading } = useQuery({
    queryKey: ["team_challenges", activeTeam?.id],
    queryFn: () => (activeTeam?.id ? getTeamChallenges(activeTeam.id) : null),
    enabled: !!activeTeam?.id,
  });

  const { data: availableOpponents = [] } = useQuery({
    queryKey: ["available_opponents", activeTeam?.id],
    queryFn: () => getAvailableOpponentTeams(activeTeam?.id),
    enabled: !!activeTeam?.id,
  });

  const filteredOpponents = availableOpponents.filter((t) =>
    t.name.toLowerCase().includes(opponentSearch.toLowerCase()) ||
    t.shortName.toLowerCase().includes(opponentSearch.toLowerCase()) ||
    (t.city && t.city.toLowerCase().includes(opponentSearch.toLowerCase()))
  );

  // Mutations
  const createChallengeMutation = useMutation({
    mutationFn: async () => {
      if (!activeTeam || !selectedOpponent) {
        throw new Error("Please select an opponent team.");
      }
      return createTeamChallenge({
        challengerTeamId: activeTeam.id,
        challengerTeamName: activeTeam.name,
        challengerTeamShortName: activeTeam.shortName,
        challengerTeamLogoUrl: activeTeam.logoUrl,
        challengerManagerId: user?.uid || `tm_${user?.email}`,
        challengerManagerEmail: user?.email || "",

        opponentTeamId: selectedOpponent.id,
        opponentTeamName: selectedOpponent.name,
        opponentTeamShortName: selectedOpponent.shortName,
        opponentTeamLogoUrl: selectedOpponent.logoUrl,
        opponentManagerId: selectedOpponent.ownerId,
        opponentManagerEmail: selectedOpponent.ownerEmail,

        challengeType,
        formatType,
        oversPerSide: parseInt(oversPerSide) || 4,
        playersPerTeam: parseInt(playersPerTeam) || 6,
        venue,
        proposedDate,
        proposedTime,
        message,
      });
    },
    onSuccess: (newCh) => {
      toast.success(`Challenge sent to ${selectedOpponent?.name}!`);
      setNewChallengeModalOpen(false);
      resetNewChallengeForm();
      queryClient.invalidateQueries({ queryKey: ["team_challenges", activeTeam?.id] });
      setActiveTab("outgoing");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to send challenge."),
  });

  const acceptChallengeMutation = useMutation({
    mutationFn: (challengeId: string) => acceptTeamChallenge(challengeId),
    onSuccess: (ch) => {
      toast.success(
        `Challenge accepted! Scorer PIN: ${ch.scorerPin || "Generated"}. Match fixtures created!`,
        { duration: 6000 }
      );
      queryClient.invalidateQueries({ queryKey: ["team_challenges", activeTeam?.id] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      setActiveTab("active");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to accept challenge."),
  });

  const declineChallengeMutation = useMutation({
    mutationFn: () => {
      if (!declineChallengeId) throw new Error("No challenge selected.");
      return declineTeamChallenge(declineChallengeId, declineReason);
    },
    onSuccess: () => {
      toast.success("Challenge declined.");
      setDeclineModalOpen(false);
      setDeclineChallengeId(null);
      setDeclineReason("");
      queryClient.invalidateQueries({ queryKey: ["team_challenges", activeTeam?.id] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to decline challenge."),
  });

  const withdrawChallengeMutation = useMutation({
    mutationFn: (challengeId: string) => withdrawTeamChallenge(challengeId),
    onSuccess: () => {
      toast.success("Challenge withdrawn.");
      queryClient.invalidateQueries({ queryKey: ["team_challenges", activeTeam?.id] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to withdraw challenge."),
  });

  const resetNewChallengeForm = () => {
    setSelectedOpponent(null);
    setOpponentSearch("");
    setChallengeType("SINGLE");
    setFormatType("TAPE_BALL_INDOOR");
    setOversPerSide("4");
    setPlayersPerTeam("6");
    setMessage("");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  if (!activeTeam) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
          <Shield className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">No Active Team Selected</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Please select or register a managed team from the overview tab before issuing match challenges.
        </p>
        <Link to="/team">
          <Button variant="outline" className="rounded-xl">Go to Overview</Button>
        </Link>
      </div>
    );
  }

  const incomingCount = challenges?.incoming.length || 0;
  const activeCount = challenges?.active.length || 0;
  const outgoingCount = challenges?.outgoing.length || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-card border border-border/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Swords className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Bilateral Friendlies & Series
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Challenges & Friendlies
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Challenge other registered clubs in PitchPe for single friendly matches or bilateral series (Best of 3, Best of 5) with instant Scorer PINs and live scorecards.
          </p>
        </div>

        <Button
          onClick={() => {
            resetNewChallengeForm();
            setNewChallengeModalOpen(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold gap-2 rounded-xl shadow-md shrink-0 self-start sm:self-auto z-10"
        >
          <Plus className="h-4 w-4" /> Issue New Challenge
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
        <TabsList className="grid grid-cols-4 p-1 bg-muted/60 border rounded-xl max-w-2xl">
          <TabsTrigger value="incoming" className="text-xs font-bold gap-1.5 rounded-lg">
            Incoming {incomingCount > 0 && <Badge className="h-4 px-1.5 bg-amber-500 text-slate-950 font-black text-[10px]">{incomingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs font-bold gap-1.5 rounded-lg">
            Active Friendlies {activeCount > 0 && <Badge className="h-4 px-1.5 bg-emerald-500 text-slate-950 font-black text-[10px]">{activeCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="text-xs font-bold gap-1.5 rounded-lg">
            Outgoing ({outgoingCount})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs font-bold gap-1.5 rounded-lg">
            Completed / History
          </TabsTrigger>
        </TabsList>

        {/* 1. INCOMING CHALLENGES TAB */}
        <TabsContent value="incoming" className="space-y-4">
          {challengesLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading incoming challenges…</div>
          ) : challenges?.incoming && challenges.incoming.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {challenges.incoming.map((ch) => (
                <Card key={ch.id} className="border border-border/80 bg-card rounded-2xl shadow-sm space-y-4 p-5 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    {/* Header: Challenger & Badge */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <TeamBadge shortName={ch.challengerTeamShortName} logoUrl={ch.challengerTeamLogoUrl} size="md" />
                        <div>
                          <h3 className="font-bold text-base text-foreground leading-snug">{ch.challengerTeamName}</h3>
                          <p className="text-xs text-muted-foreground">Challenged your club ({activeTeam.name})</p>
                        </div>
                      </div>
                      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] font-bold">
                        PENDING
                      </Badge>
                    </div>

                    {/* Match specs */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40 text-xs border border-border/60">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Match Type</span>
                        <strong className="text-foreground font-semibold">
                          {ch.challengeType === "SINGLE" ? "Single Match" : ch.challengeType.replace(/_/g, " ")} ({ch.numberOfMatches} {ch.numberOfMatches === 1 ? "Match" : "Matches"})
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Rules</span>
                        <strong className="text-foreground font-semibold">{ch.oversPerSide} Overs · {ch.playersPerTeam}v{ch.playersPerTeam}</strong>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-border/40 flex items-center gap-3 text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-emerald-400" /> {ch.proposedDate}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-emerald-400" /> {ch.proposedTime || "19:00"}</span>
                        <span className="flex items-center gap-1 truncate"><MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> {ch.venue}</span>
                      </div>
                    </div>

                    {ch.message && (
                      <p className="text-xs text-muted-foreground/90 italic bg-muted/20 p-2.5 rounded-lg border border-border/40">
                        "{ch.message}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Button
                      onClick={() => acceptChallengeMutation.mutate(ch.id)}
                      disabled={acceptChallengeMutation.isPending}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-9 rounded-xl shadow-sm gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Accept Challenge
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDeclineChallengeId(ch.id);
                        setDeclineModalOpen(true);
                      }}
                      className="text-xs h-9 rounded-xl border-border hover:bg-muted text-muted-foreground hover:text-red-400"
                    >
                      Decline
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed rounded-2xl bg-card/30 space-y-3">
              <div className="h-12 w-12 rounded-xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Swords className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold">No Incoming Challenges</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Your club has no pending challenge requests. You can challenge any registered club in PitchPe to start a friendly series!
              </p>
              <Button
                size="sm"
                onClick={() => {
                  resetNewChallengeForm();
                  setNewChallengeModalOpen(true);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
              >
                Challenge an Opponent
              </Button>
            </div>
          )}
        </TabsContent>

        {/* 2. ACTIVE FRIENDLIES TAB */}
        <TabsContent value="active" className="space-y-4">
          {challengesLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading active friendlies…</div>
          ) : challenges?.active && challenges.active.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {challenges.active.map((ch) => {
                const isChallenger = ch.challengerTeamId === activeTeam.id;
                const opponentName = isChallenger ? ch.opponentTeamName : ch.challengerTeamName;
                const opponentShort = isChallenger ? ch.opponentTeamShortName : ch.challengerTeamShortName;
                const opponentLogo = isChallenger ? ch.opponentTeamLogoUrl : ch.challengerTeamLogoUrl;

                return (
                  <Card key={ch.id} className="border border-border/80 bg-card rounded-2xl shadow-md p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3.5">
                      {/* Header: Series Title & Scorer PIN */}
                      <div className="flex items-center justify-between gap-2 border-b pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <Flame className="h-3.5 w-3.5 text-amber-400" />
                            {ch.challengeType === "SINGLE" ? "Single Match Friendly" : `${ch.challengeType.replace(/_/g, " ")} Series`}
                          </span>
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                          ACTIVE
                        </Badge>
                      </div>

                      {/* Opponent & Bilateral Standings */}
                      <div className="flex items-center justify-between gap-4 py-1">
                        <div className="flex items-center gap-3">
                          <TeamBadge shortName={activeTeam.shortName} logoUrl={activeTeam.logoUrl} size="md" />
                          <span className="font-black text-sm text-foreground">{activeTeam.name}</span>
                        </div>

                        <div className="text-center font-mono px-3 py-1 rounded-xl bg-muted/60 border border-border/60">
                          <div className="text-xs text-muted-foreground font-sans font-bold">SERIES</div>
                          <div className="text-base font-black text-emerald-400">
                            {isChallenger ? `${ch.challengerWins ?? 0} - ${ch.opponentWins ?? 0}` : `${ch.opponentWins ?? 0} - ${ch.challengerWins ?? 0}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <span className="font-black text-sm text-foreground">{opponentName}</span>
                          <TeamBadge shortName={opponentShort} logoUrl={opponentLogo} size="md" />
                        </div>
                      </div>

                      {/* Scorer PIN Box */}
                      {ch.scorerPin && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-emerald-400 shrink-0" />
                            <div>
                              <span className="text-[11px] text-muted-foreground block">Ground Scorer PIN</span>
                              <span className="font-mono font-black text-sm text-emerald-400 tracking-wider">
                                {ch.scorerPin}
                              </span>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(ch.scorerPin!, "Scorer PIN")}
                            className="h-7 text-xs font-bold gap-1 text-emerald-400 hover:text-emerald-300"
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </Button>
                        </div>
                      )}

                      {/* Match Link & Venue Details */}
                      <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{ch.venue} · {ch.oversPerSide} Overs Match</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>{ch.proposedDate} at {ch.proposedTime || "19:00"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {ch.matchIds?.length || 1} Match Fixture{(ch.matchIds?.length || 1) > 1 ? "s" : ""}
                      </span>

                      {ch.matchIds && ch.matchIds.length > 0 && (
                        <Link to={`/live/${ch.matchIds[0]}`}>
                          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-8 rounded-lg gap-1 shadow-sm">
                            Live Scorecard <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed rounded-2xl bg-card/30 space-y-3">
              <div className="h-12 w-12 rounded-xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold">No Active Friendly Series</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Once a challenge is accepted, its live scorecard, series standing, and Scorer PIN will appear here.
              </p>
            </div>
          )}
        </TabsContent>

        {/* 3. OUTGOING CHALLENGES TAB */}
        <TabsContent value="outgoing" className="space-y-4">
          {challengesLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading outgoing challenges…</div>
          ) : challenges?.outgoing && challenges.outgoing.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {challenges.outgoing.map((ch) => (
                <Card key={ch.id} className="border border-border/80 bg-card rounded-2xl p-5 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <TeamBadge shortName={ch.opponentTeamShortName} logoUrl={ch.opponentTeamLogoUrl} size="md" />
                        <div>
                          <h3 className="font-bold text-base text-foreground leading-snug">{ch.opponentTeamName}</h3>
                          <p className="text-xs text-muted-foreground">Challenge sent by you</p>
                        </div>
                      </div>
                      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] font-bold">
                        AWAITING ACCEPTANCE
                      </Badge>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 text-xs border border-border/60 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <strong className="font-semibold text-foreground">{ch.challengeType.replace(/_/g, " ")} ({ch.numberOfMatches} Matches)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rules:</span>
                        <strong className="font-semibold text-foreground">{ch.oversPerSide} Overs · {ch.playersPerTeam} Players</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Schedule:</span>
                        <span className="text-foreground">{ch.proposedDate} at {ch.proposedTime || "19:00"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => withdrawChallengeMutation.mutate(ch.id)}
                      disabled={withdrawChallengeMutation.isPending}
                      className="text-xs text-muted-foreground hover:text-red-400 rounded-xl"
                    >
                      Withdraw Challenge
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed rounded-2xl bg-card/30 space-y-3">
              <div className="h-12 w-12 rounded-xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold">No Outgoing Pending Challenges</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Ready to play? Issue a new challenge to any club in PitchPe.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  resetNewChallengeForm();
                  setNewChallengeModalOpen(true);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
              >
                Challenge a Club
              </Button>
            </div>
          )}
        </TabsContent>

        {/* 4. COMPLETED / HISTORY TAB */}
        <TabsContent value="completed" className="space-y-4">
          {challenges?.completed && challenges.completed.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {challenges.completed.map((ch) => (
                <Card key={ch.id} className="border border-border/80 bg-card rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-bold">{ch.challengeType.replace(/_/g, " ")}</span>
                    <Badge className="bg-muted text-muted-foreground text-[10px] font-bold">
                      {ch.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>{ch.challengerTeamName}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span>{ch.opponentTeamName}</span>
                  </div>
                  {ch.declineReason && (
                    <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                      Decline reason: {ch.declineReason}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-2xl bg-card/30">
              No completed challenge history yet.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ISSUE NEW CHALLENGE MODAL */}
      <Dialog open={newChallengeModalOpen} onOpenChange={setNewChallengeModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <Swords className="h-5 w-5 text-emerald-400" /> Issue Match / Series Challenge
            </DialogTitle>
            <DialogDescription className="text-xs">
              Challenge another registered cricket club for a single friendly match or bilateral series.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Step 1: Select Opponent Club */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">1. Select Opponent Club *</Label>
              {selectedOpponent ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TeamBadge shortName={selectedOpponent.shortName} logoUrl={selectedOpponent.logoUrl} size="md" />
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{selectedOpponent.name}</h4>
                      <p className="text-xs text-muted-foreground">{selectedOpponent.city || "Pakistan"} · {selectedOpponent.shortName}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedOpponent(null)}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder="Search club by name or city…"
                      value={opponentSearch}
                      onChange={(e) => setOpponentSearch(e.target.value)}
                      className="pl-9 text-xs rounded-xl h-9"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto border rounded-xl divide-y bg-card/50">
                    {filteredOpponents.length > 0 ? (
                      filteredOpponents.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedOpponent(t)}
                          className="p-2.5 flex items-center justify-between hover:bg-muted/60 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <TeamBadge shortName={t.shortName} logoUrl={t.logoUrl} size="sm" />
                            <div className="truncate">
                              <span className="font-bold text-xs block truncate text-foreground">{t.name}</span>
                              <span className="text-[10px] text-muted-foreground">{t.city || "Registered Club"}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0 font-mono font-bold">
                            {t.shortName}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-muted-foreground">
                        No opponent clubs found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Challenge Type / Series Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">2. Series Mode *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { type: "SINGLE" as ChallengeType, label: "Single Match", desc: "1 Match" },
                  { type: "SERIES_2" as ChallengeType, label: "2-Match Tie", desc: "2 Matches" },
                  { type: "BEST_OF_3" as ChallengeType, label: "Best of 3", desc: "3 Matches" },
                  { type: "BEST_OF_5" as ChallengeType, label: "Best of 5", desc: "5 Matches" },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setChallengeType(item.type)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      challengeType === item.type
                        ? "bg-emerald-500/15 border-emerald-500 text-foreground font-bold shadow-sm"
                        : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Match Format & Rules */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Format Type</Label>
                <select
                  value={formatType}
                  onChange={(e) => {
                    const fmt = e.target.value as TournamentFormatType;
                    setFormatType(fmt);
                    if (fmt === "TAPE_BALL_INDOOR") {
                      setOversPerSide("4");
                      setPlayersPerTeam("6");
                    } else if (fmt === "T10") {
                      setOversPerSide("10");
                      setPlayersPerTeam("11");
                    } else if (fmt === "T20") {
                      setOversPerSide("20");
                      setPlayersPerTeam("11");
                    }
                  }}
                  className="w-full h-9 rounded-xl border bg-background px-3 text-xs"
                >
                  <option value="TAPE_BALL_INDOOR">Tape-Ball Indoor / Box</option>
                  <option value="T10">T10 Standard</option>
                  <option value="T20">T20 Official</option>
                  <option value="CUSTOM">Custom Rules</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Overs Per Side</Label>
                <Input
                  type="number"
                  min="2"
                  max="50"
                  value={oversPerSide}
                  onChange={(e) => setOversPerSide(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Step 4: Schedule & Venue */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs font-bold">Proposed Date</Label>
                <Input
                  type="date"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs font-bold">Proposed Time</Label>
                <Input
                  type="time"
                  value={proposedTime}
                  onChange={(e) => setProposedTime(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs font-bold">Venue / Ground</Label>
                <Input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Askari XI Ground"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Step 5: Friendly Note */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Friendly Message / Note (Optional)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Weekend evening tape-ball match with red tape-ball, 6v6 rules."
                rows={2}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setNewChallengeModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createChallengeMutation.mutate()}
              disabled={!selectedOpponent || createChallengeMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl gap-1.5"
            >
              <Swords className="h-4 w-4" /> Send Challenge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DECLINE CHALLENGE REASON MODAL */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Decline Challenge</DialogTitle>
            <DialogDescription className="text-xs">
              Optionally provide a reason why your club cannot accept this match fixture.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label className="text-xs font-bold">Reason (Optional)</Label>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Squad unavailable on proposed date / Ground conflict."
              rows={3}
              className="text-xs rounded-xl mt-1.5"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeclineModalOpen(false)} className="text-xs rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => declineChallengeMutation.mutate()}
              disabled={declineChallengeMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-xl"
            >
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
