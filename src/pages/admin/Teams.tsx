import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getTeams, getPlayers, getTournamentTeamMemberships, getAllTeams } from "@/lib/queries";
import {
  upsertTeam,
  respondToTournamentRequest,
  inviteTeamToTournament,
} from "@/lib/mutations";
import { useTournament } from "@/context/TournamentContext";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TeamBadge } from "@/components/TeamBadge";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Crown,
  Pencil,
  Plus,
  Users,
  Inbox,
  UserPlus,
  Send,
  CheckCircle2,
  XCircle,
  Search,
  Clock,
  Shield,
} from "lucide-react";
import { Link } from "react-router";
import type { TournamentTeamMembership } from "@/lib/firestore";

type TeamForm = {
  id?: string;
  name: string;
  shortName: string;
  groupName: "A" | "B";
  logoUrl: string;
};

const emptyForm: TeamForm = { name: "", shortName: "", groupName: "A", logoUrl: "" };

export default function AdminTeams() {
  const { tournamentId, tournament } = useTournament();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"PARTICIPATING" | "REQUESTS" | "INVITE" | "SENT_INVITES">("PARTICIPATING");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TeamForm>(emptyForm);

  // Invite Form State
  const [inviteTeamId, setInviteTeamId] = useState("");
  const [inviteGroup, setInviteGroup] = useState<"A" | "B">("A");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");

  // Queries
  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams", tournamentId],
    queryFn: () => getTeams(tournamentId),
    staleTime: 30 * 1000,
  });

  const { data: players } = useQuery({
    queryKey: ["players", tournamentId],
    queryFn: () => getPlayers(tournamentId),
    staleTime: 60 * 1000,
  });

  const { data: memberships = [], isLoading: isLoadingMemberships } = useQuery({
    queryKey: ["tournamentTeamMemberships", tournamentId],
    queryFn: () => getTournamentTeamMemberships(tournamentId),
  });

  const { data: allGlobalTeams = [] } = useQuery({
    queryKey: ["all_global_teams"],
    queryFn: getAllTeams,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["teams", tournamentId] });
    queryClient.invalidateQueries({ queryKey: ["teams"] });
    queryClient.invalidateQueries({ queryKey: ["tournamentTeamMemberships", tournamentId] });
    queryClient.invalidateQueries({ queryKey: ["standings", tournamentId] });
  };

  // Upsert Team
  const upsert = useMutation({
    mutationFn: (args: Parameters<typeof upsertTeam>[0]) =>
      upsertTeam({ ...args, tournamentId }),
    onSuccess: () => {
      toast.success("Team saved");
      setOpen(false);
      setForm(emptyForm);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Respond to join request
  const respondMutation = useMutation({
    mutationFn: (args: { membershipId: string; status: "ACCEPTED" | "REJECTED"; groupName?: "A" | "B" }) =>
      respondToTournamentRequest({
        membershipId: args.membershipId,
        status: args.status,
        groupName: args.groupName,
      }),
    onSuccess: (res) => {
      toast.success(
        res.status === "ACCEPTED"
          ? "Team accepted into tournament!"
          : "Team request rejected.",
      );
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to process request."),
  });

  // Send team invite
  const inviteMutation = useMutation({
    mutationFn: (args: { teamId: string; groupName: "A" | "B" }) =>
      inviteTeamToTournament({
        tournamentId,
        teamId: args.teamId,
        invitedBy: user?.email || "Organizer",
        groupName: args.groupName,
      }),
    onSuccess: () => {
      toast.success("Tournament invitation sent to Team Manager!");
      setInviteTeamId("");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to send invitation."),
  });

  const pendingRequests = memberships.filter((m) => m.source === "TEAM_REQUEST" && m.status === "PENDING");
  const sentInvitations = memberships.filter((m) => m.source === "ORGANIZER_INVITE" && m.status === "INVITED");

  // Filter global teams for invitation (exclude teams already participating/pending)
  const participatingTeamIds = new Set(teams?.map((t) => t.id) || []);
  const availableTeamsToInvite = allGlobalTeams.filter(
    (t) =>
      !participatingTeamIds.has(t.id) &&
      !sentInvitations.some((inv) => inv.teamId === t.id) &&
      (t.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
        t.shortName.toLowerCase().includes(teamSearchQuery.toLowerCase())),
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight">Teams & Squads</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage tournament clubs, incoming team requests, and official invitations for <strong>{tournament?.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setForm(emptyForm);
              setOpen(true);
            }}
            className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Team Manually
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border overflow-x-auto">
        <Button
          size="sm"
          variant={activeTab === "PARTICIPATING" ? "default" : "ghost"}
          className={`text-xs h-8 rounded-lg font-bold ${
            activeTab === "PARTICIPATING" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("PARTICIPATING")}
        >
          Participating Teams ({teams?.length || 0})
        </Button>

        <Button
          size="sm"
          variant={activeTab === "REQUESTS" ? "default" : "ghost"}
          className={`text-xs h-8 rounded-lg font-bold relative ${
            activeTab === "REQUESTS" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("REQUESTS")}
        >
          <Inbox className="h-3.5 w-3.5 mr-1" />
          Join Requests
          {pendingRequests.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500 text-white font-bold animate-pulse">
              {pendingRequests.length}
            </span>
          )}
        </Button>

        <Button
          size="sm"
          variant={activeTab === "INVITE" ? "default" : "ghost"}
          className={`text-xs h-8 rounded-lg font-bold ${
            activeTab === "INVITE" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("INVITE")}
        >
          <UserPlus className="h-3.5 w-3.5 mr-1" />
          Invite Team
        </Button>

        <Button
          size="sm"
          variant={activeTab === "SENT_INVITES" ? "default" : "ghost"}
          className={`text-xs h-8 rounded-lg font-bold ${
            activeTab === "SENT_INVITES" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("SENT_INVITES")}
        >
          <Send className="h-3.5 w-3.5 mr-1" />
          Sent Invites ({sentInvitations.length})
        </Button>
      </div>

      {/* Tab 1: Participating Teams Table */}
      {activeTab === "PARTICIPATING" && (
        <div className="rounded-xl border shadow-sm overflow-x-auto bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Team</TableHead>
                <TableHead>Short</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Team Captain</TableHead>
                <TableHead>Squad Size</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>Loading…</TableCell>
                  </TableRow>
                ))}
              {teams?.map((t) => {
                const teamPlayers = (players ?? []).filter((p) => p.teamId === t.id);
                const captain = teamPlayers.find((p) => p.isCaptain || p.designation === "Captain");

                return (
                  <TableRow key={t.id} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <TeamBadge shortName={t.shortName} logoUrl={t.logoUrl} size="sm" />
                        <div>
                          <span className="font-bold text-xs">{t.name}</span>
                          {t.ownerEmail && (
                            <p className="text-[10px] text-muted-foreground">Manager: {t.ownerEmail}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-xs">{t.shortName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Group {t.groupName || "A"}</Badge>
                    </TableCell>
                    <TableCell>
                      {captain ? (
                        <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                          <Crown className="h-3.5 w-3.5" />
                          {captain.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Not assigned yet
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/players?team=${t.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-bold"
                      >
                        <Users className="h-3.5 w-3.5" />
                        {teamPlayers.length} players
                      </Link>
                    </TableCell>
                    <TableCell className="text-right space-x-1.5">
                      <Link to={`/admin/players?team=${t.id}&add=true`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-bold border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 gap-1"
                          title="Add player to this team squad"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setForm({
                            id: t.id,
                            name: t.name,
                            shortName: t.shortName,
                            groupName: t.groupName || "A",
                            logoUrl: t.logoUrl ?? "",
                          });
                          setOpen(true);
                        }}
                        className="h-8 w-8"
                        title="Edit team details"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tab 2: Incoming Join Requests */}
      {activeTab === "REQUESTS" && (
        <div className="space-y-4">
          {pendingRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((req) => (
                <Card key={req.id} className="border-2 border-amber-500/40 bg-card shadow-sm flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                        PENDING REQUEST
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <TeamBadge shortName={req.teamShortName || "TM"} logoUrl={req.teamLogoUrl} size="md" />
                      <div>
                        <CardTitle className="text-base font-black">{req.teamName || "Cricket Club"}</CardTitle>
                        <CardDescription className="text-xs">
                          Requested by: <strong>{req.requestedBy}</strong>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    {req.notes && (
                      <p className="text-xs text-muted-foreground italic bg-muted/20 p-2.5 rounded-xl border">
                        "{req.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-bold">Assign Group:</Label>
                        <select
                          id={`group-select-${req.id}`}
                          defaultValue={req.groupName || "A"}
                          className="h-8 px-2 text-xs font-bold rounded-lg border bg-background"
                        >
                          <option value="A">Group A</option>
                          <option value="B">Group B</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            respondMutation.mutate({
                              membershipId: req.id,
                              status: "REJECTED",
                            })
                          }
                          disabled={respondMutation.isPending}
                          className="text-xs font-bold rounded-xl h-8 text-rose-500 hover:bg-rose-500/10"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const sel = document.getElementById(`group-select-${req.id}`) as HTMLSelectElement;
                            const grp = (sel?.value as "A" | "B") || "A";
                            respondMutation.mutate({
                              membershipId: req.id,
                              status: "ACCEPTED",
                              groupName: grp,
                            });
                          }}
                          disabled={respondMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl h-8 shadow-sm"
                        >
                          Accept Team
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center space-y-2 border-dashed bg-muted/10">
              <Inbox className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-bold text-base">No Pending Join Requests</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                When team managers apply to enter this tournament, their requests will appear here for your review and group assignment.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Tab 3: Invite Registered Team */}
      {activeTab === "INVITE" && (
        <div className="space-y-6 max-w-2xl">
          <Card className="border-border/70 p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="font-black text-base flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-500" /> Invite Team to Tournament
              </h3>
              <p className="text-xs text-muted-foreground">
                Search from all registered cricket teams on PitchPe / WasaCricket and send an official tournament invitation.
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
                  placeholder="Search club name or short code..."
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Label className="text-xs font-bold">Assign to Group:</Label>
                <div className="flex items-center gap-2">
                  {(["A", "B"] as const).map((g) => (
                    <Button
                      key={g}
                      size="sm"
                      variant={inviteGroup === g ? "default" : "outline"}
                      className={`text-xs h-8 px-3 rounded-lg font-bold ${
                        inviteGroup === g ? "bg-emerald-600 text-white" : ""
                      }`}
                      onClick={() => setInviteGroup(g)}
                    >
                      Group {g}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t divide-y max-h-72 overflow-y-auto">
              {availableTeamsToInvite.length > 0 ? (
                availableTeamsToInvite.map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TeamBadge shortName={t.shortName} logoUrl={t.logoUrl} size="sm" />
                      <div>
                        <span className="font-bold text-xs">{t.name}</span>
                        <p className="text-[10px] text-muted-foreground">
                          {t.city || "Club"} {t.ownerEmail && `· Manager: ${t.ownerEmail}`}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => inviteMutation.mutate({ teamId: t.id, groupName: inviteGroup })}
                      disabled={inviteMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl h-8"
                    >
                      Send Invitation
                    </Button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {allGlobalTeams.length === 0
                    ? "No teams registered on the platform yet."
                    : "No matching teams found to invite."}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 4: Sent Invitations */}
      {activeTab === "SENT_INVITES" && (
        <div className="space-y-4">
          {sentInvitations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sentInvitations.map((inv) => (
                <Card key={inv.id} className="border-border/70 p-4 space-y-3 bg-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-sky-500 border-sky-500/30 text-[10px] font-bold">
                        INVITATION PENDING
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Group {inv.groupName || "A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <TeamBadge shortName={inv.teamShortName || "TM"} logoUrl={inv.teamLogoUrl} size="sm" />
                      <div>
                        <h4 className="font-bold text-xs">{inv.teamName || "Cricket Club"}</h4>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Sent: {new Date(inv.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const tourneyName = tournament?.name || "Cricket Tournament";
                        const inviteUrl = `${window.location.origin}/team/requests`;
                        const text = encodeURIComponent(
                          `🏏 *Tournament Invitation!*\n\n` +
                          `Your cricket team *${inv.teamName}* has been invited to join *${tourneyName}*!\n\n` +
                          `👉 Log in to the Team Manager Portal to accept:\n${inviteUrl}`
                        );
                        window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
                      }}
                      className="text-[11px] font-bold h-7 px-2.5 rounded-lg border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10"
                    >
                      Share via WhatsApp
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center space-y-2 border-dashed bg-muted/10">
              <Send className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-bold text-base">No Pending Sent Invitations</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Invitations you send to team managers will appear here until they accept or decline.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Add / Edit Team Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Team" : "Add Team"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Wolves"
              />
            </div>
            <div className="space-y-2">
              <Label>Short name (e.g. WOL)</Label>
              <Input
                value={form.shortName}
                onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                placeholder="WOL"
              />
            </div>
            <div className="space-y-2">
              <Label>Group</Label>
              <Select
                value={form.groupName}
                onValueChange={(v) => setForm({ ...form, groupName: v as "A" | "B" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Group A</SelectItem>
                  <SelectItem value="B">Group B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Logo URL (optional)</Label>
              <Input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <Button
              className="w-full"
              disabled={upsert.isPending || !form.name || !form.shortName}
              onClick={() =>
                upsert.mutate({
                  id: form.id,
                  name: form.name,
                  shortName: form.shortName,
                  groupName: form.groupName,
                  logoUrl: form.logoUrl || undefined,
                })
              }
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
