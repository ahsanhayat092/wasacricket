import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getTournamentMembers, getTournaments, getTournament, getUserTournaments } from "@/lib/queries";
import {
  inviteTournamentMember,
  updateTournamentMemberRole,
  removeTournamentMember,
  updateTournamentScorerPin,
} from "@/lib/mutations";
import { useAuth } from "@/hooks/useAuth";
import { useTournament } from "@/context/TournamentContext";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ShieldCheck,
  UserCheck,
  Plus,
  Trash2,
  Pencil,
  ShieldAlert,
  KeyRound,
  Crown,
  Share2,
  Users,
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
  Copy,
  MessageCircle,
} from "lucide-react";
import type { TournamentMember, TournamentRole } from "@/lib/firestore";

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { tournamentId, tournament, setTournamentId } = useTournament();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [filterRole, setFilterRole] = useState<string>("ALL");

  // Invite Form State
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<TournamentRole>("ADMIN");

  // PIN Form State
  const [newPin, setNewPin] = useState(tournament?.scorerPin || "1234");

  const { data: tournaments } = useQuery({
    queryKey: ["user_tournaments", currentUser?.uid, currentUser?.email],
    queryFn: () => getUserTournaments(currentUser?.email, currentUser?.uid),
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ["tournamentMembers", tournamentId],
    queryFn: () => getTournamentMembers(tournamentId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tournamentMembers", tournamentId] });
    queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
    queryClient.invalidateQueries({ queryKey: ["tournaments"] });
  };

  // 1. Invite Mutation
  const inviteMutation = useMutation({
    mutationFn: (args: { email: string; name: string; role: TournamentRole }) =>
      inviteTournamentMember({
        tournamentId,
        userEmail: args.email,
        userName: args.name,
        role: args.role,
        invitedBy: currentUser?.email || "Owner",
      }),
    onSuccess: (member) => {
      toast.success(`Successfully invited ${member.userName} as ${member.role}!`);
      setInviteModalOpen(false);
      setEmail("");
      setName("");
      setRole("ADMIN");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to invite member."),
  });

  // 2. Change Role Mutation
  const changeRoleMutation = useMutation({
    mutationFn: (args: { memberId: string; role: TournamentRole }) =>
      updateTournamentMemberRole(args.memberId, args.role),
    onSuccess: () => {
      toast.success("Member role updated successfully.");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update role."),
  });

  // 3. Remove Member Mutation
  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeTournamentMember(memberId),
    onSuccess: () => {
      toast.success("Member removed from tournament.");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to remove member."),
  });

  // 4. Update PIN Mutation
  const pinMutation = useMutation({
    mutationFn: (pin: string) => updateTournamentScorerPin(tournamentId, pin),
    onSuccess: () => {
      toast.success("Scorer PIN updated successfully.");
      setPinModalOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update PIN."),
  });

  const handleSharePinWhatsApp = () => {
    const pin = tournament?.scorerPin || "1234";
    const scorerUrl = `${window.location.origin}/scorer/login`;
    const text = encodeURIComponent(
      `🏏 *${tournament?.name || "Cricket Tournament"}* — Match Scorer Access\n\n` +
      `Ground scorers and match volunteers can unlock the live scoring console using the PIN below:\n\n` +
      `🔑 *4-Digit Scorer PIN:* ${pin}\n` +
      `👉 *Scorer Console:* ${scorerUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleShareInviteWhatsApp = (userEmail: string, roleName: string) => {
    const tourneyName = tournament?.name || "Cricket Tournament";
    const text = encodeURIComponent(
      `🏏 You have been invited as a *${roleName}* for *${tourneyName}*!\n\n` +
      `Sign in to access the organizer workspace:\n` +
      `👉 ${window.location.origin}/organizer/login`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const filteredMembers = members?.filter((m) => {
    if (filterRole === "ALL") return true;
    return m.role === filterRole;
  }) ?? [];

  const adminCount = members?.filter((m) => m.role === "ADMIN").length ?? 0;
  const scorerCount = members?.filter((m) => m.role === "SCORER").length ?? 0;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Header & Event Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 font-bold">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                People & Permissions
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active Tournament: <strong className="text-foreground">{tournament?.name || "WASA Premier League 2026"}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tournaments && tournaments.length > 1 && (
            <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border">
              <span className="text-xs font-semibold text-muted-foreground px-2 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-emerald-500" /> Event:
              </span>
              <select
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                className="h-8 px-2.5 text-xs font-bold rounded-lg border-0 bg-card text-foreground cursor-pointer"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            onClick={() => setInviteModalOpen(true)}
            className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 rounded-xl shadow-sm"
          >
            <Plus className="h-4 w-4" /> Invite Administrator / Scorer
          </Button>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Tournament Owner Spotlight */}
        <Card className="border-2 border-emerald-500/40 bg-emerald-500/[0.02] shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                <Crown className="h-3.5 w-3.5 text-amber-400" /> TOURNAMENT OWNER
              </span>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                FULL ACCESS
              </Badge>
            </div>
            <CardTitle className="text-base font-black truncate">
              {currentUser?.email || "Tournament Creator"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground">
              Creator of this tournament with ultimate authority to manage rules, invite co-admins, assign scorers, and delete the event.
            </p>
            <div className="text-[11px] text-muted-foreground/80 pt-2 border-t flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Cannot be removed or demoted
            </div>
          </CardContent>
        </Card>

        {/* 2. Co-Administrators Card */}
        <Card className="border-border/70 flex flex-col justify-between">
          <CardHeader className="pb-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-500 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-500" /> CO-ADMINISTRATORS
              </span>
              <Badge variant="outline" className="text-[10px] font-bold text-sky-500 border-sky-500/30">
                {adminCount} Active
              </Badge>
            </div>
            <CardTitle className="text-2xl font-black">{adminCount}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground">
              Authorized to manage teams, player rosters, match scheduling, and assign scorers.
            </p>
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterRole("ADMIN")}
                className="text-xs font-bold text-sky-500 p-0 h-auto hover:bg-transparent hover:underline"
              >
                View Administrators →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 3. Matchday Ground Scorer PIN Card */}
        <Card className="border-2 border-amber-500/40 bg-amber-500/[0.02] shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                <KeyRound className="h-3.5 w-3.5 text-amber-500" /> SCORER MATCH PIN
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNewPin(tournament?.scorerPin || "1234");
                  setPinModalOpen(true);
                }}
                className="h-6 text-[10px] font-bold text-amber-500 hover:text-amber-400 p-0"
              >
                <Pencil className="h-3 w-3 mr-1" /> Edit PIN
              </Button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <CardTitle className="text-3xl font-mono font-black tracking-widest text-foreground">
                {tournament?.scorerPin || "1234"}
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-bold text-amber-500 border-amber-500/30">
                {scorerCount} Designated
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground">
              Casual match volunteers can unlock live scoring instantly using this 4-digit PIN.
            </p>
            <div className="pt-2 border-t flex items-center justify-between">
              <Button
                onClick={handleSharePinWhatsApp}
                size="sm"
                className="h-8 px-3 rounded-lg text-xs font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white gap-1.5 shadow-sm"
              >
                <MessageCircle className="h-3.5 w-3.5 fill-white" /> Share Scorer PIN
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Directory Table Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black tracking-tight">Assigned Team Members & Roles</h2>
            <Badge variant="secondary" className="text-xs font-bold">
              {filteredMembers.length} Members
            </Badge>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border">
            {[
              { key: "ALL", label: "All Roles" },
              { key: "ADMIN", label: `Admins (${adminCount})` },
              { key: "SCORER", label: `Scorers (${scorerCount})` },
            ].map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                variant={filterRole === tab.key ? "default" : "ghost"}
                className={`text-xs h-8 rounded-lg font-bold ${
                  filterRole === tab.key ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground"
                }`}
                onClick={() => setFilterRole(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Loading tournament permissions...
          </div>
        ) : filteredMembers.length > 0 ? (
          <Card className="overflow-hidden border-border/70">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-bold text-xs">Member / Email</TableHead>
                  <TableHead className="font-bold text-xs">Tournament Role</TableHead>
                  <TableHead className="font-bold text-xs">Invited By</TableHead>
                  <TableHead className="font-bold text-xs">Date Added</TableHead>
                  <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((m) => {
                  const isAdmin = m.role === "ADMIN";

                  return (
                    <TableRow key={m.id} className="hover:bg-muted/20">
                      <TableCell className="font-semibold text-xs">
                        <div>
                          <p className="font-bold text-foreground">{m.userName || "Team Member"}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{m.userEmail}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            isAdmin
                              ? "text-sky-500 border-sky-500/30 bg-sky-500/10"
                              : "text-amber-500 border-amber-500/30 bg-amber-500/10"
                          }`}
                        >
                          {isAdmin ? "🛡️ ADMINISTRATOR" : "⚡ SCORER"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {m.invitedBy || "Owner"}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Role Toggle Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              changeRoleMutation.mutate({
                                memberId: m.id,
                                role: isAdmin ? "SCORER" : "ADMIN",
                              })
                            }
                            title={`Switch to ${isAdmin ? "Scorer" : "Admin"}`}
                          >
                            Switch to {isAdmin ? "Scorer" : "Admin"}
                          </Button>

                          {/* WhatsApp Invite Resend */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10"
                            onClick={() => handleShareInviteWhatsApp(m.userEmail, m.role)}
                            title="Resend Invite via WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>

                          {/* Remove Member */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                            onClick={() => {
                              if (confirm(`Remove ${m.userEmail} from this tournament?`)) {
                                removeMutation.mutate(m.id);
                              }
                            }}
                            title="Remove Access"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="p-12 text-center space-y-3 border-dashed">
            <Users className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="font-bold text-base">No Additional Members Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You are currently the sole administrator of this tournament. Click below to invite co-organizers or ground scorers.
            </p>
            <Button
              onClick={() => setInviteModalOpen(true)}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1" /> Invite Co-Administrator or Scorer
            </Button>
          </Card>
        )}
      </div>

      {/* Permissions Matrix Reference Table */}
      <Card className="border-border/60 bg-muted/10 p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-emerald-500" /> Tournament-Scoped RBAC Permission Guide
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Members only have access to the specific tournament they are invited to.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl border bg-card space-y-1.5">
            <span className="font-bold text-emerald-500 flex items-center gap-1">
              <Crown className="h-3.5 w-3.5 text-amber-400" /> Tournament Owner
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Full control. Can configure match rules, invite/remove co-admins, assign scorers, and delete the tournament.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border bg-card space-y-1.5">
            <span className="font-bold text-sky-500 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Co-Administrator
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Operational control. Can manage teams, edit player rosters, generate fixtures, and assign ground scorers.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border bg-card space-y-1.5">
            <span className="font-bold text-amber-500 flex items-center gap-1">
              <KeyRound className="h-3.5 w-3.5" /> Match Scorer
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Scoring console access. Can record toss, select playing lineups, input deliveries, and finalize results.
            </p>
          </div>
        </div>
      </Card>

      {/* 1. Invite Member Dialog */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border-emerald-500/40">
          <DialogHeader className="space-y-2 pb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-black tracking-tight">
              Invite Team Member
            </DialogTitle>
            <DialogDescription className="text-xs">
              Grant administrator or scorer access to "{tournament?.name}".
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim()) {
                toast.error("Please enter a valid email.");
                return;
              }
              inviteMutation.mutate({ email: email.trim(), name: name.trim(), role });
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Email Address *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="h-10 text-xs rounded-xl"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Display Name / Role</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Asad (Head of Logistics)"
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Select Role *</Label>
              <Select value={role} onValueChange={(v) => setRole(v as TournamentRole)}>
                <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN" className="text-xs font-bold">
                    🛡️ Tournament Administrator (Teams, Fixtures & Scorers)
                  </SelectItem>
                  <SelectItem value="SCORER" className="text-xs font-bold">
                    ⚡ Match Scorer (Live Ball-by-Ball Console Access)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                {inviteMutation.isPending ? "Sending Invite..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Edit Scorer PIN Dialog */}
      <Dialog open={pinModalOpen} onOpenChange={setPinModalOpen}>
        <DialogContent className="max-w-sm p-6 bg-card border-amber-500/40">
          <DialogHeader className="space-y-2 text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <KeyRound className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-black tracking-tight">
              Update Scorer Match PIN
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set a 4 to 6 digit PIN for ground volunteers to start scoring.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newPin.trim() || newPin.trim().length < 4) {
                toast.error("PIN must be at least 4 digits.");
                return;
              }
              pinMutation.mutate(newPin.trim());
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5 text-center">
              <Label className="text-xs font-bold">4-Digit Scorer PIN</Label>
              <Input
                type="text"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="1234"
                className="h-12 text-center text-2xl font-mono tracking-widest font-bold rounded-xl"
                autoFocus
              />
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPinModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pinMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                {pinMutation.isPending ? "Saving..." : "Save Scorer PIN"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
