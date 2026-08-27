import React, { useState } from "react";
import { useTeam } from "@/context/TeamContext";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getOpenTournaments, getTournaments } from "@/lib/queries";
import {
  requestJoinTournament,
  updateTournamentSquad,
  withdrawTournamentRequest,
} from "@/lib/mutations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Trophy,
  Users,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Calendar,
  Layers,
  Flame,
} from "lucide-react";
import { Link } from "react-router";
import type { Tournament, TournamentTeamMembership } from "@/lib/firestore";

export default function TeamTournaments() {
  const { user } = useAuth();
  const { activeTeam, players, memberships, isLoadingMemberships } = useTeam();

  const [activeTab, setActiveTab] = useState<"MY_TOURNAMENTS" | "FIND_TOURNAMENTS">("MY_TOURNAMENTS");
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [requestNotes, setRequestNotes] = useState("");
  const [selectedSquadPlayerIds, setSelectedSquadPlayerIds] = useState<string[]>([]);

  // Squad Management State
  const [squadModalOpen, setSquadModalOpen] = useState(false);
  const [activeMembership, setActiveMembership] = useState<TournamentTeamMembership | null>(null);

  // Fetch all available public tournaments
  const { data: openTournaments = [], isLoading: isLoadingOpen } = useQuery({
    queryKey: ["open_tournaments"],
    queryFn: getTournaments,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["team_memberships", activeTeam?.id] });
    queryClient.invalidateQueries({ queryKey: ["open_tournaments"] });
  };

  // Request to join mutation
  const requestMutation = useMutation({
    mutationFn: (args: { tournamentId: string; notes?: string }) => {
      if (!activeTeam) throw new Error("No active team selected.");
      return requestJoinTournament({
        tournamentId: args.tournamentId,
        teamId: activeTeam.id,
        requestedBy: user?.email || "manager",
        squadPlayerIds: selectedSquadPlayerIds,
        notes: args.notes,
      });
    },
    onSuccess: () => {
      toast.success("Participation request submitted! Awaiting tournament organizer approval.");
      setRequestModalOpen(false);
      setSelectedTournament(null);
      setRequestNotes("");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to submit request."),
  });

  // Squad update mutation
  const squadMutation = useMutation({
    mutationFn: () => {
      if (!activeMembership) throw new Error("No active membership.");
      return updateTournamentSquad({
        membershipId: activeMembership.id,
        squadPlayerIds: selectedSquadPlayerIds,
      });
    },
    onSuccess: () => {
      toast.success("Tournament squad roster updated!");
      setSquadModalOpen(false);
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update squad."),
  });

  const acceptedMemberships = memberships.filter((m) => m.status === "ACCEPTED");

  // Helper to get status of active team in any tournament
  const getTeamStatusInTourney = (tournamentId: string) => {
    const mem = memberships.find((m) => m.tournamentId === tournamentId);
    return mem ? mem.status : null;
  };

  const handleOpenRequestModal = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    // Pre-select all current players into squad by default
    setSelectedSquadPlayerIds(players.map((p) => p.id));
    setRequestModalOpen(true);
  };

  const handleOpenSquadModal = (membership: TournamentTeamMembership) => {
    setActiveMembership(membership);
    // Set initially selected squad players or all players
    setSelectedSquadPlayerIds(membership.squadPlayerIds || players.map((p) => p.id));
    setSquadModalOpen(true);
  };

  const togglePlayerInSquad = (playerId: string) => {
    setSelectedSquadPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId],
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Tournaments
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tournaments for <strong>{activeTeam?.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border">
          <Button
            size="sm"
            variant={activeTab === "MY_TOURNAMENTS" ? "default" : "ghost"}
            className={`text-xs h-8 rounded-lg font-bold ${
              activeTab === "MY_TOURNAMENTS" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("MY_TOURNAMENTS")}
          >
            My Tournaments ({acceptedMemberships.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "FIND_TOURNAMENTS" ? "default" : "ghost"}
            className={`text-xs h-8 rounded-lg font-bold ${
              activeTab === "FIND_TOURNAMENTS" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("FIND_TOURNAMENTS")}
          >
            <Search className="h-3.5 w-3.5 mr-1" /> Find Tournaments
          </Button>
        </div>
      </div>

      {/* Tab 1: My Tournaments */}
      {activeTab === "MY_TOURNAMENTS" && (
        <div className="space-y-4">
          {acceptedMemberships.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {acceptedMemberships.map((m) => {
                const tourney = m.tournament;
                const squadSize = m.squadPlayerIds?.length || players.length;

                return (
                  <Card key={m.id} className="border-border/70 overflow-hidden bg-card shadow-sm flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                          ACCEPTED PARTICIPANT
                        </Badge>
                        <span className="text-xs font-bold text-muted-foreground">
                          Group {m.groupName || "A"}
                        </span>
                      </div>
                      <CardTitle className="text-lg font-black pt-1">
                        {tourney?.name || "Cricket Tournament"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {tourney?.venueName || "Venue Askari XI"} · Format: {tourney?.formatType || "Tape Ball"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                      <div className="p-3 rounded-xl bg-muted/20 border flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-emerald-500" /> Tournament Squad:
                        </span>
                        <strong className="font-bold">{squadSize} Players</strong>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenSquadModal(m)}
                          className="text-xs font-bold rounded-xl gap-1.5 h-8 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                        >
                          <Users className="h-3.5 w-3.5" /> Manage Squad
                        </Button>

                        <Link to={tourney?.slug ? `/t/${tourney.slug}` : "/"}>
                          <Button size="sm" variant="ghost" className="text-xs font-bold gap-1 text-muted-foreground hover:text-foreground h-8">
                            Public Portal <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 text-center space-y-3 border-dashed">
              <Trophy className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-bold text-base">You haven't joined any tournaments yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Explore open tournaments looking for participating cricket clubs and send join requests.
              </p>
              <Button
                onClick={() => setActiveTab("FIND_TOURNAMENTS")}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
              >
                Find Tournaments Now
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Find Tournaments */}
      {activeTab === "FIND_TOURNAMENTS" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openTournaments.map((tourney) => {
              const status = getTeamStatusInTourney(tourney.id);
              const isAccepted = status === "ACCEPTED";
              const isPending = status === "PENDING";
              const isInvited = status === "INVITED";
              const isRejected = status === "REJECTED";

              return (
                <Card key={tourney.id} className="border-border/70 bg-card shadow-sm flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {tourney.formatType || "Cricket Tournament"}
                      </Badge>
                      {status && (
                        <Badge
                          className={`text-[10px] font-bold ${
                            isAccepted
                              ? "bg-emerald-600 text-white"
                              : isPending
                              ? "bg-amber-500 text-white"
                              : isInvited
                              ? "bg-sky-500 text-white"
                              : "bg-rose-500 text-white"
                          }`}
                        >
                          {status}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg font-black pt-1">
                      {tourney.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {tourney.venueName || "Lahore"} · {tourney.oversPerSide || 4} Overs/Innings
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="flex items-center justify-between gap-2 pt-2 border-t">
                      <Link to={tourney.slug ? `/t/${tourney.slug}` : "/"}>
                        <Button size="sm" variant="ghost" className="text-xs font-bold gap-1 text-muted-foreground hover:text-foreground h-8">
                          View Details <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>

                      {isAccepted ? (
                        <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Participating
                        </span>
                      ) : isPending ? (
                        <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                          <Clock className="h-4 w-4" /> Request Sent
                        </span>
                      ) : isInvited ? (
                        <Link to="/team/requests">
                          <Button size="sm" className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl h-8">
                            View Invitation
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleOpenRequestModal(tourney)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl h-8 shadow-sm"
                        >
                          Request to Join
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. Request to Join Modal */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border-emerald-500/40">
          <DialogHeader className="space-y-1 pb-2">
            <DialogTitle className="text-xl font-black tracking-tight">
              Request to Join Tournament
            </DialogTitle>
            <DialogDescription className="text-xs">
              Apply with <strong>{activeTeam?.name}</strong> to enter "{selectedTournament?.name}".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-2xl bg-muted/20 border space-y-1 text-xs">
              <span className="font-bold text-foreground block">Tournament Details</span>
              <p className="text-muted-foreground">
                Venue: {selectedTournament?.venueName || "Askari XI"} · Format: {selectedTournament?.formatType || "Tape Ball"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Manager Notes / Remarks (Optional)</Label>
              <Textarea
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                placeholder="e.g. Confirming 15 players available for weekend match fixtures."
                className="text-xs rounded-xl resize-none h-20"
              />
            </div>

            {players.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Select Tournament Squad ({selectedSquadPlayerIds.length}/{players.length})</Label>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSquadPlayerIds(
                        selectedSquadPlayerIds.length === players.length ? [] : players.map((p) => p.id),
                      )
                    }
                    className="text-[11px] font-bold text-emerald-500 hover:underline"
                  >
                    {selectedSquadPlayerIds.length === players.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto divide-y border rounded-xl p-2 bg-muted/10 text-xs">
                  {players.map((p) => (
                    <div key={p.id} className="py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedSquadPlayerIds.includes(p.id)}
                          onCheckedChange={() => togglePlayerInSquad(p.id)}
                          id={`sq-${p.id}`}
                        />
                        <label htmlFor={`sq-${p.id}`} className="font-semibold cursor-pointer">
                          {p.name}
                        </label>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{p.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 border-t gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRequestModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() =>
                  requestMutation.mutate({
                    tournamentId: selectedTournament!.id,
                    notes: requestNotes,
                  })
                }
                disabled={requestMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                {requestMutation.isPending ? "Sending Request..." : "Submit Join Request"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Manage Tournament Squad Modal */}
      <Dialog open={squadModalOpen} onOpenChange={setSquadModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border-emerald-500/40">
          <DialogHeader className="space-y-1 pb-2">
            <DialogTitle className="text-xl font-bold">
              Tournament Squad Roster
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select which players from your permanent roster participate in this tournament.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold">
                Selected: {selectedSquadPlayerIds.length} / {players.length} Players
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedSquadPlayerIds(
                    selectedSquadPlayerIds.length === players.length ? [] : players.map((p) => p.id),
                  )
                }
                className="text-[11px] font-bold text-emerald-500 hover:underline"
              >
                {selectedSquadPlayerIds.length === players.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y border rounded-xl p-2 bg-muted/10 text-xs">
              {players.map((p) => (
                <div key={p.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      checked={selectedSquadPlayerIds.includes(p.id)}
                      onCheckedChange={() => togglePlayerInSquad(p.id)}
                      id={`squad-edit-${p.id}`}
                    />
                    <label htmlFor={`squad-edit-${p.id}`} className="font-semibold cursor-pointer">
                      {p.name}
                    </label>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{p.role}</span>
                </div>
              ))}
            </div>

            <DialogFooter className="pt-3 border-t gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSquadModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => squadMutation.mutate()}
                disabled={squadMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                {squadMutation.isPending ? "Saving..." : "Save Squad Roster"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
