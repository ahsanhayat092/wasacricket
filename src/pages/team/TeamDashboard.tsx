import React, { useState } from "react";
import { useTeam } from "@/context/TeamContext";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { createManagedTeam, updateManagedTeam } from "@/lib/mutations";
import { getSchedule, getTeamChallenges } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import {
  Users,
  Trophy,
  Calendar,
  Inbox,
  Plus,
  Pencil,
  ArrowRight,
  Shield,
  MapPin,
  Crown,
  Sparkles,
  CheckCircle2,
  Clock,
  Swords,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

export default function TeamDashboard() {
  const { user } = useAuth();
  const { activeTeam, teams, isLoading, players, memberships, refetchTeams } = useTeam();
  const navigate = useNavigate();

  const { data: challenges } = useQuery({
    queryKey: ["team_challenges", activeTeam?.id],
    queryFn: () => (activeTeam?.id ? getTeamChallenges(activeTeam.id) : null),
    enabled: !!activeTeam?.id,
  });

  // Create Team Onboarding State
  const [createName, setCreateName] = useState("");
  const [createShortName, setCreateShortName] = useState("");
  const [createCity, setCreateCity] = useState("");
  const [createLogoUrl, setCreateLogoUrl] = useState("");

  // Edit Team State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editShortName, setEditShortName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");

  // Create Team Mutation
  const createTeamMutation = useMutation({
    mutationFn: () =>
      createManagedTeam({
        name: createName,
        shortName: createShortName,
        city: createCity,
        logoUrl: createLogoUrl,
        ownerId: user?.uid || `tm_${user?.email}`,
        ownerEmail: user?.email || "",
      }),
    onSuccess: (newTeam) => {
      toast.success(`Team "${newTeam.name}" created successfully!`);
      refetchTeams();
      queryClient.invalidateQueries({ queryKey: ["user_managed_teams"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setCreateName("");
      setCreateShortName("");
      setCreateCity("");
      setCreateLogoUrl("");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create team."),
  });

  // Edit Team Mutation
  const editTeamMutation = useMutation({
    mutationFn: () =>
      updateManagedTeam({
        id: activeTeam!.id,
        name: editName,
        shortName: editShortName,
        city: editCity,
        logoUrl: editLogoUrl,
        ownerId: user?.uid,
        ownerEmail: user?.email,
      }),
    onSuccess: () => {
      toast.success("Team details updated!");
      setEditModalOpen(false);
      refetchTeams();
      queryClient.invalidateQueries({ queryKey: ["user_managed_teams"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update team."),
  });

  // Fetch upcoming matches across accepted tournaments for active team
  const { data: schedule = [] } = useQuery({
    queryKey: ["schedule_team", activeTeam?.id],
    queryFn: () => getSchedule(),
    enabled: !!activeTeam?.id,
  });

  const teamMatches = schedule.filter(
    (m) => (m.teamAId === activeTeam?.id || m.teamBId === activeTeam?.id),
  );
  const upcomingMatches = teamMatches.filter((m) => m.status === "UPCOMING" || m.status === "LIVE");

  const acceptedMemberships = memberships.filter((m) => m.status === "ACCEPTED");
  const pendingMemberships = memberships.filter((m) => m.status === "PENDING" || m.status === "INVITED");

  // 1. Onboarding Screen if user has no teams yet
  if (!isLoading && teams.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
            <Users className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Create Your Cricket Team</h1>
          <p className="text-sm text-muted-foreground">
            Set up your club identity, register player rosters, and request to participate in tournaments.
          </p>
        </div>

        <Card className="border-emerald-500/40 shadow-xl bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold">Team Profile</CardTitle>
            <CardDescription className="text-xs">
              Basic team information for schedules, scorecards, and standings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!createName.trim() || !createShortName.trim()) {
                  toast.error("Please enter team name and short code.");
                  return;
                }
                createTeamMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Team Full Name *</Label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Lahore Lions Cricket Club"
                  className="h-10 text-xs rounded-xl"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Short Name (3-4 Chars) *</Label>
                  <Input
                    value={createShortName}
                    onChange={(e) => setCreateShortName(e.target.value.toUpperCase())}
                    placeholder="e.g. LLC"
                    maxLength={5}
                    className="h-10 text-xs rounded-xl uppercase font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">City / Location</Label>
                  <Input
                    value={createCity}
                    onChange={(e) => setCreateCity(e.target.value)}
                    placeholder="e.g. Lahore"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Team Logo URL (Optional)</Label>
                <Input
                  value={createLogoUrl}
                  onChange={(e) => setCreateLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={createTeamMutation.isPending}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md gap-2"
              >
                {createTeamMutation.isPending ? "Creating Team..." : "Create Team & Continue"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const captain = players.find((p) => p.isCaptain || p.designation === "Captain");

  return (
    <div className="space-y-8">
      {/* Team Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-r from-emerald-950/20 via-card to-background p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <TeamBadge
              shortName={activeTeam?.shortName || "TM"}
              logoUrl={activeTeam?.logoUrl}
              size="lg"
              className="h-16 w-16 text-xl rounded-2xl shadow-md border"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {activeTeam?.name}
                </h1>
                <Badge variant="outline" className="font-mono font-bold text-xs">
                  {activeTeam?.shortName}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                {activeTeam?.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                    {activeTeam.city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-sky-500" />
                  {players.length} Permanent Players
                </span>
                {captain && (
                  <span className="flex items-center gap-1 font-semibold text-amber-500">
                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                    Captain: {captain.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditName(activeTeam?.name || "");
                setEditShortName(activeTeam?.shortName || "");
                setEditCity(activeTeam?.city || "");
                setEditLogoUrl(activeTeam?.logoUrl || "");
                setEditModalOpen(true);
              }}
              className="text-xs font-bold rounded-xl gap-1.5 h-9"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Team
            </Button>
            <Link to="/team/tournaments">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl gap-1.5 h-9 shadow-sm"
              >
                <Trophy className="h-3.5 w-3.5" /> Find Tournaments
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-border/70 p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
            MY TEAM
          </span>
          <div className="text-xl font-black truncate">{activeTeam?.name}</div>
          <p className="text-[11px] text-muted-foreground">{activeTeam?.city || "Registered Club"}</p>
        </Card>

        <Card className="border-border/70 p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 block">
            PLAYERS
          </span>
          <div className="text-2xl font-black">{players.length}</div>
          <Link to="/team/players" className="text-[11px] font-bold text-emerald-500 hover:underline">
            Manage Roster →
          </Link>
        </Card>

        <Card className="border-border/70 p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-500 block">
            TOURNAMENTS
          </span>
          <div className="text-2xl font-black">{acceptedMemberships.length}</div>
          <Link to="/team/tournaments" className="text-[11px] font-bold text-sky-500 hover:underline">
            View Tournaments →
          </Link>
        </Card>

        <Card className="border-border/70 p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 block">
            FRIENDLIES & CHALLENGES
          </span>
          <div className="text-2xl font-black">
            {(challenges?.active.length || 0) + (challenges?.incoming.length || 0)}
          </div>
          <Link to="/team/challenges" className="text-[11px] font-bold text-amber-500 hover:underline">
            Challenge Opponent →
          </Link>
        </Card>
      </div>

      {/* Main Grid: Roster Snapshot & Active Tournaments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Permanent Roster Snapshot */}
        <Card className="border-border/70 space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" /> Team Players
              </h2>
              <p className="text-xs text-muted-foreground">
                Permanent club roster ({players.length} registered)
              </p>
            </div>
            <Link to="/team/players">
              <Button size="sm" variant="outline" className="text-xs font-bold rounded-xl gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Player
              </Button>
            </Link>
          </div>

          {players.length > 0 ? (
            <div className="divide-y divide-border/60">
              {players.slice(0, 5).map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-mono font-bold text-muted-foreground">
                      {p.jerseyNumber ? `#${p.jerseyNumber}` : "—"}
                    </span>
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        {p.name}
                        {p.isCaptain && (
                          <Badge className="bg-amber-500 text-white text-[9px] px-1 py-0 font-bold">
                            C
                          </Badge>
                        )}
                        {p.isViceCaptain && (
                          <Badge className="bg-sky-500 text-white text-[9px] px-1 py-0 font-bold">
                            VC
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{p.role}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {p.battingStyle || "Batsman"}
                  </span>
                </div>
              ))}
              {players.length > 5 && (
                <div className="pt-3 text-center">
                  <Link
                    to="/team/players"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    View all {players.length} players →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <p className="text-xs text-muted-foreground">No players registered yet.</p>
              <Link to="/team/players">
                <Button size="sm" className="bg-emerald-600 text-white text-xs font-bold rounded-xl">
                  Add First Player
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* 2. Tournaments & Upcoming Matches */}
        <Card className="border-border/70 space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" /> Active Tournaments
              </h2>
              <p className="text-xs text-muted-foreground">
                Official events your team is participating in
              </p>
            </div>
            <Link to="/team/tournaments">
              <Button size="sm" variant="outline" className="text-xs font-bold rounded-xl gap-1">
                Find More
              </Button>
            </Link>
          </div>

          {acceptedMemberships.length > 0 ? (
            <div className="space-y-3">
              {acceptedMemberships.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-2xl border bg-muted/20 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-xs text-foreground">
                      {m.tournament?.name || "Tournament"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      Format: {m.tournament?.formatType || "Tape Ball"} · Group {m.groupName || "A"}
                    </p>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                    ACCEPTED
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <p className="text-xs text-muted-foreground">
                You haven't joined any tournaments yet.
              </p>
              <Link to="/team/tournaments">
                <Button size="sm" className="bg-emerald-600 text-white text-xs font-bold rounded-xl">
                  Browse Open Tournaments
                </Button>
              </Link>
            </div>
          )}

          {/* Upcoming Matches Preview */}
          {upcomingMatches.length > 0 && (
            <div className="pt-4 border-t space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                UPCOMING FIXTURES ({upcomingMatches.length})
              </span>
              <div className="space-y-2">
                {upcomingMatches.slice(0, 2).map((match) => (
                  <div
                    key={match.id}
                    className="p-2.5 rounded-xl border bg-card text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold">{match.teamA?.name} vs {match.teamB?.name}</span>
                      <p className="text-[10px] text-muted-foreground">
                        {match.venue || "Askari XI"} · Match #{match.matchNumber}
                      </p>
                    </div>
                    {match.status === "LIVE" ? (
                      <Badge className="bg-rose-500 text-white animate-pulse text-[9px]">LIVE</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">Upcoming</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Edit Team Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border-emerald-500/40">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold">Edit Team Details</DialogTitle>
            <DialogDescription className="text-xs">
              Update team branding and club information.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              editTeamMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Team Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Short Code</Label>
                <Input
                  value={editShortName}
                  onChange={(e) => setEditShortName(e.target.value.toUpperCase())}
                  className="h-10 text-xs rounded-xl font-mono uppercase font-bold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">City</Label>
                <Input
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Logo URL</Label>
              <Input
                value={editLogoUrl}
                onChange={(e) => setEditLogoUrl(e.target.value)}
                placeholder="https://..."
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3 border-t gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editTeamMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                {editTeamMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
