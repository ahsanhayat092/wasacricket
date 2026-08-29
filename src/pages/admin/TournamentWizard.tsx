import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createTournament, upsertTeam, createMatch, inviteTeamToTournament } from "@/lib/mutations";
import { getAllTeams } from "@/lib/queries";
import { queryClient } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TeamBadge } from "@/components/TeamBadge";
import {
  Trophy,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Users,
  Shield,
  Zap,
  Clock,
  Layers,
  MapPin,
  Palette,
  Plus,
  Trash2,
  Settings2,
  Info,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  FORMAT_PRESETS,
  generateTournamentSchedule,
  type FormatPresetConfig,
} from "@/lib/fixture-generator";
import type { TournamentFormatType, PlayoffFormatType, MatchDay, Team } from "@/lib/firestore";

import { useAuth } from "@/hooks/useAuth";
import { useTournament } from "@/context/TournamentContext";
import { ShareTournamentModal } from "@/components/ShareTournamentModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type WizardTeamItem = {
  teamId?: string;
  name: string;
  shortName: string;
  color: string;
  logoUrl?: string | null;
  isExisting?: boolean;
};

export default function TournamentWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setTournamentId } = useTournament();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [createdTournament, setCreatedTournament] = useState<any | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Step 1: Basics & Branding
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [venueName, setVenueName] = useState("National Cricket Ground");
  const [venueMapsUrl, setVenueMapsUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#10b981");
  const [accentColor, setAccentColor] = useState("#f59e0b");
  const [scorerPin, setScorerPin] = useState("1234");

  // Step 2: Format & Rules
  const [selectedFormat, setSelectedFormat] = useState<TournamentFormatType>("TAPE_BALL_INDOOR");
  const [oversPerSide, setOversPerSide] = useState<number>(4);
  const [maxOverPerBowler, setMaxOverPerBowler] = useState<number>(1);
  const [playersPerTeam, setPlayersPerTeam] = useState<number>(6);
  const [maxWickets, setMaxWickets] = useState<number>(6);
  const [allowLastManStanding, setAllowLastManStanding] = useState<boolean>(true);
  const [wideRuns, setWideRuns] = useState<number>(1);
  const [noBallRuns, setNoBallRuns] = useState<number>(1);
  const [freeHitEnabled, setFreeHitEnabled] = useState<boolean>(true);

  // Step 3: Playoff Format
  const [playoffFormat, setPlayoffFormat] = useState<PlayoffFormatType>("DIRECT_TOP2");

  // Step 4: Teams (No dummy teams by default)
  const [teams, setTeams] = useState<WizardTeamItem[]>([]);
  const [selectedExistingTeamId, setSelectedExistingTeamId] = useState<string>("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamShortName, setNewTeamShortName] = useState("");

  // Query all registered platform teams for the dropdown
  const { data: allPlatformTeams = [] } = useQuery({
    queryKey: ["all_registered_teams_wizard"],
    queryFn: getAllTeams,
  });

  // Deduplicate platform teams by clean name
  const availablePlatformTeams = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of allPlatformTeams) {
      const cleanName = t.name.trim().toLowerCase();
      if (!map.has(cleanName) && !teams.some((added) => added.teamId === t.id || added.name.toLowerCase() === cleanName)) {
        map.set(cleanName, t);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allPlatformTeams, teams]);

  // Step 5: Schedule Settings
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [dailyStartTime, setDailyStartTime] = useState("20:00");
  const [matchDuration, setMatchDuration] = useState(45);
  const [matchesPerDay, setMatchesPerDay] = useState(4);
  const [doubleRoundRobin, setDoubleRoundRobin] = useState(false);

  // Auto-fill slug from name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-")) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
    if (!shortName) {
      setShortName(val.slice(0, 4).toUpperCase());
    }
  };

  // When format preset is chosen
  const handlePresetSelect = (fmtKey: TournamentFormatType) => {
    setSelectedFormat(fmtKey);
    const preset = FORMAT_PRESETS[fmtKey];
    if (preset) {
      setOversPerSide(preset.oversPerSide);
      setMaxOverPerBowler(preset.maxOverPerBowler);
      setPlayersPerTeam(preset.playersPerTeam);
      setMaxWickets(preset.maxWickets);
      setAllowLastManStanding(preset.allowLastManStanding);
      setWideRuns(preset.wideRuns);
      setNoBallRuns(preset.noBallRuns);
      setFreeHitEnabled(preset.freeHitEnabled);
      setPlayoffFormat(preset.playoffFormat);
      setMatchDuration(preset.defaultMatchDurationMinutes);
    }
  };

  // Add existing team from dropdown
  const handleAddExistingTeam = () => {
    if (!selectedExistingTeamId) {
      toast.error("Please select a team from the dropdown.");
      return;
    }
    const found = allPlatformTeams.find((t) => t.id === selectedExistingTeamId);
    if (!found) return;

    if (teams.some((t) => t.teamId === found.id || t.name.toLowerCase() === found.name.toLowerCase())) {
      toast.error(`"${found.name}" is already in your invited list.`);
      return;
    }

    const colors = ["#3b82f6", "#10b981", "#f97316", "#a855f7", "#ec4899", "#eab308"];
    const randomColor = colors[teams.length % colors.length];

    setTeams([
      ...teams,
      {
        teamId: found.id,
        name: found.name,
        shortName: found.shortName || found.name.slice(0, 3).toUpperCase(),
        color: randomColor,
        logoUrl: found.logoUrl || null,
        isExisting: true,
      },
    ]);
    setSelectedExistingTeamId("");
    toast.success(`Added "${found.name}" to tournament invite list!`);
  };

  // Add custom new team
  const handleAddCustomTeam = () => {
    if (!newTeamName.trim()) {
      toast.error("Please enter a team name.");
      return;
    }
    const sName = newTeamShortName.trim() || newTeamName.trim().slice(0, 3).toUpperCase();
    const colors = ["#3b82f6", "#10b981", "#f97316", "#a855f7", "#ec4899", "#eab308"];
    const randomColor = colors[teams.length % colors.length];

    setTeams([
      ...teams,
      {
        name: newTeamName.trim(),
        shortName: sName,
        color: randomColor,
        isExisting: false,
      },
    ]);
    setNewTeamName("");
    setNewTeamShortName("");
  };

  const handleRemoveTeam = (index: number) => {
    setTeams(teams.filter((_, i) => i !== index));
  };

  // Complete Tournament Creation Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Create Tournament doc with ownerId & ownerEmail
      const newTourney = await createTournament({
        name: name.trim(),
        shortName: shortName.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        formatType: selectedFormat,
        oversPerSide,
        maxOverPerBowler,
        playersPerTeam,
        maxWickets,
        allowLastManStanding,
        wideRuns,
        noBallRuns,
        freeHitEnabled,
        playoffFormat,
        scorerPin: scorerPin.trim() || "1234",
        venueName: venueName.trim(),
        venueMapsUrl: venueMapsUrl.trim() || null,
        ownerId: user?.uid || null,
        ownerEmail: user?.email || null,
        branding: {
          primaryColor,
          accentColor,
        },
        status: "UPCOMING",
      });

      const tourneyId = newTourney.id;

      // 2. Process Invited & Participating Teams
      const createdTeamsForSchedule: Array<{ id: string; name: string }> = [];

      for (let i = 0; i < teams.length; i++) {
        const t = teams[i];
        const groupName: "A" | "B" = i < Math.ceil(teams.length / 2) ? "A" : "B";

        if (t.isExisting && t.teamId) {
          // Send decoupled invitation membership to existing registered team
          await inviteTeamToTournament({
            tournamentId: tourneyId,
            teamId: t.teamId,
            groupName,
            invitedBy: user?.email || "Organizer",
          });
          createdTeamsForSchedule.push({ id: t.teamId, name: t.name });
        } else {
          // Create custom team document and membership invite with organizer as owner
          const savedTeam = await upsertTeam({
            tournamentId: tourneyId,
            name: t.name,
            shortName: t.shortName,
            groupName,
            ownerId: user?.uid || null,
            ownerEmail: user?.email ? user.email.toLowerCase().trim() : null,
          });
          await inviteTeamToTournament({
            tournamentId: tourneyId,
            teamId: savedTeam.id,
            groupName,
            invitedBy: user?.email || "Organizer",
          });
          createdTeamsForSchedule.push({ id: savedTeam.id, name: t.name });
        }
      }

      // 3. If 2 or more teams are present, generate initial schedule fixtures
      if (createdTeamsForSchedule.length >= 2) {
        const generatedFixtures = generateTournamentSchedule({
          teams: createdTeamsForSchedule,
          startDate,
          dailyStartTime,
          matchDurationMinutes: matchDuration,
          matchesPerDay,
          venue: venueName,
          doubleRoundRobin,
        });

        for (const fix of generatedFixtures) {
          await createMatch({
            tournamentId: tourneyId,
            matchNumber: fix.matchNumber,
            stage: fix.stage,
            day: fix.day,
            date: fix.date,
            time: fix.time,
            teamAId: fix.teamAId,
            teamBId: fix.teamBId,
            venue: fix.venue,
            oversPerSide,
          });
        }
      }

      return newTourney;
    },
    onSuccess: (newTourney) => {
      queryClient.invalidateQueries({ queryKey: ["user_tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["user_managed_teams"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team_memberships"] });
      localStorage.setItem("wasa_active_tournament_id", newTourney.id);
      setTournamentId(newTourney.id);
      setCreatedTournament(newTourney);
      toast.success(`🎉 Tournament "${name}" successfully created!`);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to create tournament.");
    },
  });

  const canProceedStep1 = name.trim().length >= 3 && slug.trim().length >= 2;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Trophy className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Create New Tournament</h1>
              <p className="text-xs text-muted-foreground">
                Set up a custom cricket championship, invite clubs, configure rules, and auto-generate fixtures.
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/tournaments")}>
          Cancel
        </Button>
      </div>

      {/* Stepper Progress */}
      <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold">
        {[
          { num: 1, label: "1. Basics & Branding" },
          { num: 2, label: "2. Format & Rules" },
          { num: 3, label: "3. Knockouts" },
          { num: 4, label: "4. Teams & Invites" },
          { num: 5, label: "5. Schedule & Launch" },
        ].map((s) => (
          <div
            key={s.num}
            onClick={() => s.num < currentStep && setCurrentStep(s.num)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              currentStep === s.num
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 font-bold shadow-sm"
                : currentStep > s.num
                ? "border-border/60 bg-card/60 text-muted-foreground hover:bg-muted/40"
                : "border-border/40 text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>

      {/* Step 1: Basics & Branding */}
      {currentStep === 1 && (
        <Card className="border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" /> Step 1: Tournament Identity & Branding
            </CardTitle>
            <CardDescription className="text-xs">
              Give your tournament a name, a unique URL slug for your public portal, and choose your brand colors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tournament Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Lahore Corporate League 2026"
                  className="h-10 text-xs font-semibold"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Short Code (3–4 Letters) *</Label>
                <Input
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value.toUpperCase())}
                  placeholder="LCL"
                  maxLength={4}
                  className="h-10 text-xs font-bold uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Public URL Slug *</Label>
              <div className="flex items-center rounded-xl border bg-muted/30 px-3 h-10 text-xs font-mono text-muted-foreground">
                <span className="text-muted-foreground/70">
                  {typeof window !== "undefined" ? window.location.host : "pitchpe.com"}/t/
                </span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="lahore-corporate-cup"
                  className="bg-transparent border-none text-foreground font-bold focus:outline-none flex-1 ml-1"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                This will be the permanent link for fans, players, and live scorecards.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Description / Organizer Notes</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Official corporate tape-ball championship organized by WASA..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-500" /> Venue Name
                </Label>
                <Input
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="Askari XI Ground, Lahore"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Google Maps Venue Link</Label>
                <Input
                  value={venueMapsUrl}
                  onChange={(e) => setVenueMapsUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">4-Digit Scorer Access PIN *</Label>
                <Input
                  value={scorerPin}
                  onChange={(e) => setScorerPin(e.target.value)}
                  placeholder="1234"
                  maxLength={6}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-emerald-500" /> Primary Theme Color
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border cursor-pointer p-0.5"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-amber-500" /> Accent Color
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border cursor-pointer p-0.5"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                disabled={!canProceedStep1}
                onClick={() => setCurrentStep(2)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
              >
                Continue to Format & Rules <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Format & Match Rules */}
      {currentStep === 2 && (
        <Card className="border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-500" /> Step 2: Format Presets & Match Rules Engine
            </CardTitle>
            <CardDescription className="text-xs">
              Pick a standard format preset or configure custom overs, bowler quotas, squad size, and LMS rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Preset Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { type: "TAPE_BALL_INDOOR", label: "🏏 Tape-Ball / Indoor", desc: "4–8 Overs, LMS, Free Hits" },
                { type: "T10_LEAGUE", label: "⚡ T10 League", desc: "10 Overs, 2 overs/bowler, 11 Players" },
                { type: "T20_STANDARD", label: "🏆 T20 Standard", desc: "20 Overs, 4 overs/bowler, ICC T20" },
                { type: "CUSTOM_ENGINE", label: "⚙️ Custom Engine", desc: "Fully custom overs & rules" },
              ].map((p) => {
                const isSelected = selectedFormat === p.type;
                return (
                  <div
                    key={p.type}
                    onClick={() => handlePresetSelect(p.type as TournamentFormatType)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 text-center ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500 font-bold"
                        : "border-border/60 bg-card hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-xs font-black">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{p.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Custom Rules Grid */}
            <div className="space-y-4 pt-2 border-t">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Match Rule Configuration
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Overs Per Side</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={oversPerSide}
                    onChange={(e) => setOversPerSide(parseInt(e.target.value, 10) || 4)}
                    className="h-9 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Max Overs Per Bowler</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={maxOverPerBowler}
                    onChange={(e) => setMaxOverPerBowler(parseInt(e.target.value, 10) || 1)}
                    className="h-9 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Players Per Team (Fielding)</Label>
                  <Input
                    type="number"
                    min={2}
                    max={11}
                    value={playersPerTeam}
                    onChange={(e) => setPlayersPerTeam(parseInt(e.target.value, 10) || 6)}
                    className="h-9 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Max Dismissals (All Out)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={11}
                    value={maxWickets}
                    onChange={(e) => setMaxWickets(parseInt(e.target.value, 10) || 6)}
                    className="h-9 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <Label className="text-xs font-bold">Last Man Standing (LMS)</Label>
                    <p className="text-[11px] text-muted-foreground">Allows lone batsman to continue alone</p>
                  </div>
                  <Switch checked={allowLastManStanding} onCheckedChange={setAllowLastManStanding} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <Label className="text-xs font-bold">Free Hit on No-Ball</Label>
                    <p className="text-[11px] text-muted-foreground">Next delivery is an un-dismissable free hit</p>
                  </div>
                  <Switch checked={freeHitEnabled} onCheckedChange={setFreeHitEnabled} />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <Label className="text-xs font-bold">No-Ball + Wide Extra</Label>
                    <p className="text-[11px] text-muted-foreground">1 penalty run added to score</p>
                  </div>
                  <Badge variant="secondary" className="font-bold">
                    +1 Run
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
              >
                Continue to Knockouts <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Knockout Structure */}
      {currentStep === 3 && (
        <Card className="border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-500" /> Step 3: Tournament Playoff & Knockout Structure
            </CardTitle>
            <CardDescription className="text-xs">
              Choose how teams qualify from the league round-robin into the finals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  type: "DIRECT_TOP2",
                  title: "🥇 Direct Top 2 Final",
                  desc: "Top 2 teams of league stage advance directly to the Grand Final. Ranks 3–6 are eliminated.",
                  badge: "Fastest / Corporate Standard",
                },
                {
                  type: "PAGE_PLAYOFF_TOP3",
                  title: "⚔️ Top 3 Page Playoff",
                  desc: "Rank 1 qualifies for Final. Rank 2 vs Rank 3 play a Playoff Match for the 2nd finalist spot.",
                  badge: "Current WASA Model",
                },
                {
                  type: "IPL_TOP4",
                  title: "🏆 IPL-Style Top 4 (Qualifiers & Eliminator)",
                  desc: "Rank 1 vs 2 (Qualifier 1), Rank 3 vs 4 (Eliminator), Qualifier 2, Grand Final.",
                  badge: "Most Competitive",
                },
                {
                  type: "SEMI_FINALS",
                  title: "🎯 Top 4 Semi-Finals & Final",
                  desc: "Rank 1 vs 4 (Semi 1), Rank 2 vs 3 (Semi 2). Winners clash in Grand Final.",
                  badge: "Traditional Knockout",
                },
              ].map((item) => {
                const isSelected = playoffFormat === item.type;
                return (
                  <div
                    key={item.type}
                    onClick={() => setPlayoffFormat(item.type as PlayoffFormatType)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500"
                        : "border-border/60 bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{item.title}</span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                    <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                      {item.badge}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => setCurrentStep(4)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
              >
                Continue to Teams <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Teams & Invites (Select from platform teams, no dummy teams) */}
      {currentStep === 4 && (
        <Card className="border-emerald-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-500" /> Step 4: Participating & Invited Teams ({teams.length} Teams)
                </CardTitle>
                <CardDescription className="text-xs">
                  Select existing platform clubs or enter new teams. Selected teams will receive tournament invitations.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                Optional at Creation
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 1. Select Existing Team from System Dropdown */}
            <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Shield className="h-4 w-4 text-emerald-500" /> Select Registered Team from Platform
              </Label>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedExistingTeamId}
                  onChange={(e) => setSelectedExistingTeamId(e.target.value)}
                  className="flex-1 h-10 px-3 text-xs font-bold rounded-xl border bg-background text-foreground"
                >
                  <option value="">-- Select a registered platform club / team --</option>
                  {availablePlatformTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      🛡️ {t.name} ({t.shortName || "CLUB"})
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleAddExistingTeam}
                  disabled={!selectedExistingTeamId}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 h-10 text-xs rounded-xl"
                >
                  <Plus className="h-4 w-4" /> Invite Selected Team
                </Button>
              </div>
            </div>

            {/* 2. Or Create & Invite a New Custom Team */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Or Enter & Invite New Team
              </Label>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <Label className="text-[11px] text-muted-foreground">Team Name</Label>
                  <Input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g. Gladiators"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5 w-28">
                  <Label className="text-[11px] text-muted-foreground">Short Code</Label>
                  <Input
                    value={newTeamShortName}
                    onChange={(e) => setNewTeamShortName(e.target.value.toUpperCase())}
                    placeholder="GLA"
                    maxLength={4}
                    className="h-9 text-xs font-bold uppercase"
                  />
                </div>
                <Button
                  onClick={handleAddCustomTeam}
                  size="sm"
                  variant="secondary"
                  className="font-bold gap-1.5 h-9 text-xs"
                >
                  <Plus className="h-4 w-4" /> Add Team
                </Button>
              </div>
            </div>

            {/* Selected Teams List */}
            {teams.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-2xl space-y-2 bg-muted/10">
                <Users className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                <p className="text-xs font-bold text-muted-foreground">No teams invited yet.</p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  You can select teams now or proceed to launch your event. Teams can also request to join via public invite link anytime.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">
                  Invited Tournament Teams ({teams.length})
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {teams.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border bg-card shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {t.logoUrl ? (
                          <img src={t.logoUrl} alt={t.name} className="w-8 h-8 rounded-lg object-contain bg-muted p-1" />
                        ) : (
                          <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0"
                            style={{ backgroundColor: t.color }}
                          >
                            {t.shortName}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{t.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-muted-foreground/30">
                              {t.isExisting ? "Registered Club" : "New Team"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">Code: {t.shortName}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 shrink-0"
                        onClick={() => handleRemoveTeam(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setCurrentStep(3)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => setCurrentStep(5)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
              >
                Continue to Final Review & Launch <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Schedule Settings & Final Launch */}
      {currentStep === 5 && (
        <Card className="border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-500" /> Step 5: Schedule & Final Launch
            </CardTitle>
            <CardDescription className="text-xs">
              Configure match timings and launch your tournament event.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* If fewer than 2 teams are ready */}
            {teams.length < 2 && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-foreground">
                    Tournament Initialization Notice ({teams.length} {teams.length === 1 ? "team" : "teams"} selected)
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    You can launch this tournament event now! Once teams accept your invitations or request to join from the public portal, you can auto-generate the complete round-robin fixtures anytime from your <strong>Admin Fixtures & Schedule</strong> panel.
                  </p>
                </div>
              </div>
            )}

            {/* Fixture Generator Options (if 2+ teams) */}
            {teams.length >= 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl border bg-muted/20">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Daily Start Time</Label>
                    <Input
                      type="time"
                      value={dailyStartTime}
                      onChange={(e) => setDailyStartTime(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Match Duration (Mins)</Label>
                    <Input
                      type="number"
                      min={15}
                      max={300}
                      value={matchDuration}
                      onChange={(e) => setMatchDuration(parseInt(e.target.value, 10) || 45)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Matches Per Day</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={matchesPerDay}
                      onChange={(e) => setMatchesPerDay(parseInt(e.target.value, 10) || 4)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                  <div>
                    <Label className="text-xs font-bold">Double Round Robin (Home & Away)</Label>
                    <p className="text-[11px] text-muted-foreground">Each team plays every other team twice</p>
                  </div>
                  <Switch checked={doubleRoundRobin} onCheckedChange={setDoubleRoundRobin} />
                </div>
              </div>
            )}

            {/* Tournament Summary Card */}
            <div className="p-4 rounded-xl border bg-card space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tournament Summary Preview
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Tournament</span>
                  <strong className="text-foreground">{name || "Untitled Tournament"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Format</span>
                  <strong className="text-emerald-500">{oversPerSide} Overs ({selectedFormat})</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Invited Teams</span>
                  <strong>{teams.length} Teams {teams.length >= 2 ? "(Auto-Fixtures Ready)" : "(Awaiting Invites)"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Playoffs</span>
                  <strong>{playoffFormat.replace(/_/g, " ")}</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setCurrentStep(4)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 px-6 shadow-lg text-xs h-11 rounded-xl"
              >
                {createMutation.isPending
                  ? "Initializing Tournament & Sending Invites..."
                  : teams.length >= 2
                  ? "🚀 Launch Tournament & Generate Fixtures"
                  : "🚀 Launch Tournament Event"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post-Publish Launchpad Dialog */}
      {createdTournament && (
        <Dialog open={!!createdTournament} onOpenChange={(open) => !open && navigate("/admin/tournaments")}>
          <DialogContent className="max-w-lg p-6 bg-card border-emerald-500/40">
            <DialogHeader className="text-center space-y-2 pb-2">
              <div className="mx-auto w-14 h-14 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner">
                <Trophy className="h-7 w-7 text-amber-400" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                🎉 Tournament Live & Ready!
              </DialogTitle>
              <DialogDescription className="text-xs">
                "{createdTournament.name}" has been successfully created with dedicated public URLs and invitation workflows.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Quick Details Chips */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-muted/20 border text-center text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Format</span>
                  <strong className="text-emerald-500 font-bold">{oversPerSide} Overs</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Invited Teams</span>
                  <strong className="font-bold">{teams.length} Teams</strong>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Scorer PIN</span>
                  <strong className="font-mono font-bold text-amber-500">{scorerPin}</strong>
                </div>
              </div>

              {/* Share & QR Trigger Button */}
              <Button
                onClick={() => setShareModalOpen(true)}
                className="w-full h-11 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs gap-2 rounded-xl shadow-md"
              >
                <span>📲 Share on WhatsApp & Download QR Poster</span>
              </Button>

              {/* Next Steps Launchpad */}
              <div className="space-y-2 pt-2 border-t">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Organizer Next Steps:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    onClick={() => navigate("/admin/teams")}
                    variant="outline"
                    className="h-10 text-xs font-bold justify-start gap-2 rounded-xl hover:bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                  >
                    <Users className="h-4 w-4" /> Manage Team Invites & Rosters
                  </Button>
                  <Button
                    onClick={() => navigate("/admin/schedule")}
                    variant="outline"
                    className="h-10 text-xs font-bold justify-start gap-2 rounded-xl"
                  >
                    <Calendar className="h-4 w-4" /> Fixtures & Schedule
                  </Button>
                </div>

                <Button
                  onClick={() => navigate(`/t/${createdTournament.slug || createdTournament.id}`)}
                  variant="secondary"
                  className="w-full h-10 text-xs font-bold gap-2 rounded-xl mt-1"
                >
                  <span>🌐 View Public Tournament Portal</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Share & QR Code Modal */}
      {createdTournament && (
        <ShareTournamentModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          tournament={createdTournament}
        />
      )}
    </div>
  );
}
