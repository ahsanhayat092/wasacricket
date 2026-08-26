import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { createTournament, upsertTeam, createMatch } from "@/lib/mutations";
import { queryClient } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  FORMAT_PRESETS,
  generateTournamentSchedule,
  type FormatPresetConfig,
} from "@/lib/fixture-generator";
import type { TournamentFormatType, PlayoffFormatType, MatchDay } from "@/lib/firestore";

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

  // Step 4: Teams
  const [teams, setTeams] = useState<Array<{ name: string; shortName: string; color: string }>>([
    { name: "Wolves", shortName: "WOL", color: "#3b82f6" },
    { name: "Lions", shortName: "LIO", color: "#eab308" },
    { name: "Tigers", shortName: "TIG", color: "#f97316" },
    { name: "Falcons", shortName: "FAL", color: "#10b981" },
  ]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamShortName, setNewTeamShortName] = useState("");

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

  // Add team to list
  const handleAddTeam = () => {
    if (!newTeamName.trim()) {
      toast.error("Please enter a team name.");
      return;
    }
    const sName = newTeamShortName.trim() || newTeamName.trim().slice(0, 3).toUpperCase();
    const colors = ["#3b82f6", "#10b981", "#f97316", "#a855f7", "#ec4899", "#eab308"];
    const randomColor = colors[teams.length % colors.length];

    setTeams([...teams, { name: newTeamName.trim(), shortName: sName, color: randomColor }]);
    setNewTeamName("");
    setNewTeamShortName("");
  };

  const handleRemoveTeam = (index: number) => {
    if (teams.length <= 2) {
      toast.error("A tournament needs at least 2 teams.");
      return;
    }
    setTeams(teams.filter((_, i) => i !== index));
  };

  // Complete Tournament Creation Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Create Tournament doc with ownerId
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
        branding: {
          primaryColor,
          accentColor,
        },
        status: "UPCOMING",
      });

      const tourneyId = newTourney.id;

      // 2. Create Teams properly scoped to tourneyId
      const createdTeams: Array<{ id: string; name: string }> = [];
      for (let i = 0; i < teams.length; i++) {
        const t = teams[i];
        const groupName: "A" | "B" = i < Math.ceil(teams.length / 2) ? "A" : "B";
        const savedTeam = await upsertTeam({
          tournamentId: tourneyId,
          name: t.name,
          shortName: t.shortName,
          groupName,
        });
        createdTeams.push({ id: savedTeam.id, name: t.name });
      }

      // 3. Generate and Save Schedule Fixtures properly scoped to tourneyId
      const generatedFixtures = generateTournamentSchedule({
        teams: createdTeams,
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

      return newTourney;
    },
    onSuccess: (newTourney) => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      setTournamentId(newTourney.id);
      setCreatedTournament(newTourney);
      toast.success(`🎉 Tournament "${name}" successfully created!`);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to create tournament.");
    },
  });

  const canProceedStep1 = name.trim().length >= 3 && slug.trim().length >= 2;
  const canProceedStep4 = teams.length >= 2;

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
                Set up a custom cricket tournament with custom rules, overs, teams, and auto-generated fixtures.
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
          { num: 4, label: "4. Teams" },
          { num: 5, label: "5. Schedule" },
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold">Tournament Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Lahore Corporate Tape-Ball Cup 2026"
                  className="h-10 text-sm font-semibold"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Short Name / Code</Label>
                <Input
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder="e.g. LCC 2026"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Public URL Slug *</Label>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-mono">wasacricket.vercel.app/t/</span>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="lahore-cup-2026"
                    className="h-9 text-xs font-mono font-bold flex-1"
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold">Description / Organizer Note</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Annual inter-firm tape-ball cricket festival held at Askari XI Lahore."
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Venue Name</Label>
                <Input
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g. Askari XI Ground, Lahore"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Venue Google Maps URL</Label>
                <Input
                  value={venueMapsUrl}
                  onChange={(e) => setVenueMapsUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Scorer 4-Digit PIN</Label>
                <Input
                  value={scorerPin}
                  onChange={(e) => setScorerPin(e.target.value)}
                  placeholder="1234"
                  maxLength={6}
                  className="h-9 text-xs font-mono font-bold"
                />
                <p className="text-[11px] text-muted-foreground">
                  Volunteers and ground scorers can use this PIN to start live scoring immediately.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Primary Brand Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 w-12 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 text-xs font-mono"
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

      {/* Step 2: Format & Rules */}
      {currentStep === 2 && (
        <Card className="border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-500" /> Step 2: Select Match Format & Rule Engine
            </CardTitle>
            <CardDescription className="text-xs">
              Choose a pre-configured cricket format preset or customize your own match rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Preset Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.keys(FORMAT_PRESETS) as TournamentFormatType[]).map((fmtKey) => {
                const preset = FORMAT_PRESETS[fmtKey];
                const isSelected = selectedFormat === fmtKey;
                return (
                  <div
                    key={fmtKey}
                    onClick={() => handlePresetSelect(fmtKey)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 shadow-md ring-1 ring-emerald-500"
                        : "border-border/60 bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{preset.name}</span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{preset.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {preset.oversPerSide} Overs
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        Max {preset.maxOverPerBowler} Over/Bowler
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {preset.playersPerTeam} Players
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Granular Rules Customization */}
            <div className="border rounded-xl p-4 bg-muted/20 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Settings2 className="h-3.5 w-3.5 text-emerald-500" /> Fine-Tune Match Parameters
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Overs Per Innings</Label>
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
                  <Label className="text-xs font-bold">Players Per Team</Label>
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

      {/* Step 4: Teams & Rosters */}
      {currentStep === 4 && (
        <Card className="border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" /> Step 4: Participating Teams ({teams.length} Teams)
            </CardTitle>
            <CardDescription className="text-xs">
              Add all competing teams. You can customize player rosters once the tournament is initialized.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Add Team Input */}
            <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl border bg-muted/20">
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <Label className="text-xs font-bold">Team Name</Label>
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Gladiators"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5 w-28">
                <Label className="text-xs font-bold">Short Code</Label>
                <Input
                  value={newTeamShortName}
                  onChange={(e) => setNewTeamShortName(e.target.value.toUpperCase())}
                  placeholder="GLA"
                  maxLength={4}
                  className="h-9 text-xs font-bold uppercase"
                />
              </div>
              <Button
                onClick={handleAddTeam}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 h-9"
              >
                <Plus className="h-4 w-4" /> Add Team
              </Button>
            </div>

            {/* Team List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teams.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border bg-card shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs text-white"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.shortName}
                    </span>
                    <div>
                      <p className="text-xs font-bold">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">Team #{idx + 1}</p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                    onClick={() => handleRemoveTeam(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setCurrentStep(3)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                disabled={!canProceedStep4}
                onClick={() => setCurrentStep(5)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
              >
                Continue to Fixture Generator <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Schedule Auto-Generator & Final Review */}
      {currentStep === 5 && (
        <Card className="border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-500" /> Step 5: Schedule & Auto-Fixture Generator
            </CardTitle>
            <CardDescription className="text-xs">
              Configure tournament match dates, start times, and generate the round-robin schedule instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

            {/* Tournament Summary Card */}
            <div className="p-4 rounded-xl border bg-card space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tournament Summary Preview
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Tournament</span>
                  <strong className="text-foreground">{name}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Format</span>
                  <strong className="text-emerald-500">{oversPerSide} Overs ({selectedFormat})</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Teams</span>
                  <strong>{teams.length} Teams (Round Robin)</strong>
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
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 px-6 shadow-lg"
              >
                {createMutation.isPending ? "Creating Tournament & Generating Fixtures..." : "🚀 Launch & Create Tournament"}
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
                "{createdTournament.name}" has been initialized with round-robin fixtures and dedicated public URLs.
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
                  <span className="text-[10px] text-muted-foreground block">Teams</span>
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
                    onClick={() => navigate("/admin/matches")}
                    variant="outline"
                    className="h-10 text-xs font-bold justify-start gap-2 rounded-xl hover:bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                  >
                    <Zap className="h-4 w-4" /> Go to Live Scoring
                  </Button>
                  <Button
                    onClick={() => navigate("/admin/teams")}
                    variant="outline"
                    className="h-10 text-xs font-bold justify-start gap-2 rounded-xl"
                  >
                    <Users className="h-4 w-4" /> Manage Team Rosters
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
