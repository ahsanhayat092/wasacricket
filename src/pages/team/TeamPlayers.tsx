import React, { useState } from "react";
import { useTeam } from "@/context/TeamContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { upsertPlayer, removePlayerFromTeam, assignPlayerToTeam } from "@/lib/mutations";
import { getUnassignedPlayers } from "@/lib/queries";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Crown,
  Search,
  ShieldAlert,
  UserCheck,
  UserPlus,
} from "lucide-react";
import type { Player } from "@/lib/firestore";

type PlayerFormState = {
  id?: string;
  name: string;
  jerseyNumber: string;
  role: "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";
  designation: "Captain" | "Vice Captain" | "Team Member";
  battingStyle: string;
  bowlingStyle: string;
  photoUrl: string;
};

const emptyForm: PlayerFormState = {
  name: "",
  jerseyNumber: "",
  role: "Batsman",
  designation: "Team Member",
  battingStyle: "Right-hand bat",
  bowlingStyle: "Right-arm medium",
  photoUrl: "",
};

export default function TeamPlayers() {
  const { activeTeam, players, isLoadingPlayers } = useTeam();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PlayerFormState>(emptyForm);
  const [playerToRemove, setPlayerToRemove] = useState<Player | null>(null);

  // Free agent / unassigned player selection
  const [addMode, setAddMode] = useState<"new" | "unassigned">("new");
  const [selectedUnassignedId, setSelectedUnassignedId] = useState<string>("");
  const [unassignedJersey, setUnassignedJersey] = useState<string>("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["team_players", activeTeam?.id] });
    queryClient.invalidateQueries({ queryKey: ["players"] });
    queryClient.invalidateQueries({ queryKey: ["unassigned_players"] });
  };

  // Query unassigned players from the database
  const { data: unassignedPlayers = [] } = useQuery({
    queryKey: ["unassigned_players"],
    queryFn: () => getUnassignedPlayers(),
  });

  // Upsert Player Mutation
  const upsertMutation = useMutation({
    mutationFn: (data: PlayerFormState) => {
      if (!activeTeam?.id) throw new Error("No active team selected.");
      return upsertPlayer({
        id: data.id,
        teamId: activeTeam.id,
        name: data.name.trim(),
        jerseyNumber: data.jerseyNumber ? parseInt(data.jerseyNumber, 10) : undefined,
        role: data.role,
        designation: data.designation,
        isCaptain: data.designation === "Captain",
        isViceCaptain: data.designation === "Vice Captain",
        battingStyle: data.battingStyle || undefined,
        bowlingStyle: data.bowlingStyle || undefined,
        photoUrl: data.photoUrl || undefined,
      });
    },
    onSuccess: () => {
      toast.success(form.id ? "Player profile updated!" : "Player added to roster!");
      setModalOpen(false);
      setForm(emptyForm);
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save player."),
  });

  // Remove Player from Team Mutation (Preserves historical stats)
  const removeMutation = useMutation({
    mutationFn: (playerId: string) => removePlayerFromTeam(playerId),
    onSuccess: () => {
      toast.success(
        `${playerToRemove?.name || "Player"} removed from ${activeTeam?.name || "team"} roster. Stats preserved.`,
      );
      setPlayerToRemove(null);
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to remove player."),
  });

  // Assign existing unassigned player to team
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!activeTeam?.id) throw new Error("No active team selected.");
      if (!selectedUnassignedId) throw new Error("Please select a player to add.");
      await assignPlayerToTeam(selectedUnassignedId, activeTeam.id, {
        jerseyNumber: unassignedJersey ? parseInt(unassignedJersey, 10) : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Player added to roster!");
      setModalOpen(false);
      setSelectedUnassignedId("");
      setUnassignedJersey("");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to add player."),
  });

  const filteredPlayers = players.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.jerseyNumber && p.jerseyNumber.toString().includes(search));
    const matchRole = roleFilter === "ALL" || p.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleEdit = (p: Player) => {
    setForm({
      id: p.id,
      name: p.name,
      jerseyNumber: p.jerseyNumber ? p.jerseyNumber.toString() : "",
      role: p.role || "Batsman",
      designation: p.designation || (p.isCaptain ? "Captain" : p.isViceCaptain ? "Vice Captain" : "Team Member"),
      battingStyle: p.battingStyle || "Right-hand bat",
      bowlingStyle: p.bowlingStyle || "Right-arm medium",
      photoUrl: p.photoUrl || "",
    });
    setAddMode("new");
    setModalOpen(true);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-500" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Players & Roster
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage permanent player profiles for <strong>{activeTeam?.name}</strong>.
          </p>
        </div>

        <Button
          onClick={() => {
            setForm(emptyForm);
            setModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5 h-9 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Player to Roster
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search player by name or jersey..."
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "Batsman", "Bowler", "All-rounder", "Wicketkeeper"].map((role) => (
            <Button
              key={role}
              size="sm"
              variant={roleFilter === role ? "default" : "outline"}
              className={`text-xs h-8 rounded-lg font-bold ${
                roleFilter === role ? "bg-emerald-600 text-white" : "text-muted-foreground"
              }`}
              onClick={() => setRoleFilter(role)}
            >
              {role === "ALL" ? "All Roles" : role}
            </Button>
          ))}
        </div>
      </div>

      {/* Players Table */}
      {isLoadingPlayers ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Loading player roster...
        </div>
      ) : filteredPlayers.length > 0 ? (
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                <TableHead className="text-xs font-bold">Player Name</TableHead>
                <TableHead className="text-xs font-bold">Role</TableHead>
                <TableHead className="text-xs font-bold">Designation</TableHead>
                <TableHead className="text-xs font-bold">Batting / Bowling</TableHead>
                <TableHead className="text-xs font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/20">
                  <TableCell className="text-center font-mono font-bold text-xs text-muted-foreground">
                    {p.jerseyNumber ? `#${p.jerseyNumber}` : "—"}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={p.photoUrl || undefined} />
                        <AvatarFallback className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                          {p.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          {p.name}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {p.role}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {p.isCaptain || p.designation === "Captain" ? (
                      <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                        <Crown className="h-3.5 w-3.5 text-amber-400" /> Captain
                      </span>
                    ) : p.isViceCaptain || p.designation === "Vice Captain" ? (
                      <span className="text-xs font-bold text-sky-500 flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-sky-400" /> Vice Captain
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Team Member</span>
                    )}
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    <span>{p.battingStyle || "Right-hand bat"}</span>
                    {p.bowlingStyle && <span> · {p.bowlingStyle}</span>}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(p)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Edit Player"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setPlayerToRemove(p)}
                        className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                        title="Remove Player from Team"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="p-12 text-center space-y-3 border-dashed">
          <Users className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-base">No Players in Roster</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Add players to your team roster to participate in tournament matches.
          </p>
          <Button
            onClick={() => {
              setForm(emptyForm);
              setAddMode("new");
              setSelectedUnassignedId("");
              setUnassignedJersey("");
              setModalOpen(true);
            }}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Player
          </Button>
        </Card>
      )}

      {/* Add / Edit Player Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border-emerald-500/40">
          <DialogHeader className="space-y-1 pb-2">
            <DialogTitle className="text-xl font-bold">
              {form.id
                ? "Edit Player"
                : addMode === "unassigned"
                ? "Add Free Agent / Existing Player"
                : "Add Player to Roster"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {form.id
                ? `Update player details for ${activeTeam?.name}.`
                : addMode === "unassigned"
                ? `Assign a registered player to ${activeTeam?.name}.`
                : `Create a new player profile for ${activeTeam?.name}.`}
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switcher when adding a new player and unassigned players exist */}
          {!form.id && unassignedPlayers.length > 0 && (
            <div className="flex rounded-lg bg-muted p-1 gap-1 text-xs mb-2">
              <button
                type="button"
                onClick={() => setAddMode("new")}
                className={`flex-1 py-1.5 px-3 rounded-md font-bold transition-all ${
                  addMode === "new"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Plus className="inline h-3.5 w-3.5 mr-1" />
                Create New Profile
              </button>
              <button
                type="button"
                onClick={() => setAddMode("unassigned")}
                className={`flex-1 py-1.5 px-3 rounded-md font-bold transition-all ${
                  addMode === "unassigned"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserPlus className="inline h-3.5 w-3.5 mr-1" />
                Free Agents ({unassignedPlayers.length})
              </button>
            </div>
          )}

          {addMode === "unassigned" && !form.id ? (
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Select Player *</Label>
                <Select
                  value={selectedUnassignedId}
                  onValueChange={setSelectedUnassignedId}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                    <SelectValue placeholder="Choose a registered player..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {unassignedPlayers.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        <span className="font-bold">{u.name}</span>
                        <span className="text-muted-foreground ml-1.5">
                          ({u.role}{u.battingStyle ? ` · ${u.battingStyle}` : ""})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  These players are in the database without an assigned team. Assigning them keeps all their previous match records and career statistics intact.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Team Jersey Number (Optional)</Label>
                <Input
                  type="number"
                  value={unassignedJersey}
                  onChange={(e) => setUnassignedJersey(e.target.value)}
                  placeholder="e.g. 10"
                  className="h-10 text-xs rounded-xl font-mono font-bold"
                />
              </div>

              <DialogFooter className="pt-4 border-t gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => assignMutation.mutate()}
                  disabled={!selectedUnassignedId || assignMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  {assignMutation.isPending ? "Adding..." : "Add to Team"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.name.trim()) {
                  toast.error("Player name is required.");
                  return;
                }
                upsertMutation.mutate(form);
              }}
              className="space-y-4 pt-1"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Player Full Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Babar Azam"
                  className="h-10 text-xs rounded-xl"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Jersey Number</Label>
                  <Input
                    type="number"
                    value={form.jerseyNumber}
                    onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })}
                    placeholder="e.g. 56"
                    className="h-10 text-xs rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Playing Role *</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm({ ...form, role: v as any })}
                  >
                    <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Batsman" className="text-xs font-bold">Batsman</SelectItem>
                      <SelectItem value="Bowler" className="text-xs font-bold">Bowler</SelectItem>
                      <SelectItem value="All-rounder" className="text-xs font-bold">All-rounder</SelectItem>
                      <SelectItem value="Wicketkeeper" className="text-xs font-bold">Wicketkeeper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Team Designation</Label>
                <Select
                  value={form.designation}
                  onValueChange={(v) => setForm({ ...form, designation: v as any })}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Team Member" className="text-xs">Team Member</SelectItem>
                    <SelectItem value="Captain" className="text-xs font-bold text-amber-500">👑 Captain</SelectItem>
                    <SelectItem value="Vice Captain" className="text-xs font-bold text-sky-500">🛡️ Vice Captain</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Batting Style</Label>
                  <Select
                    value={form.battingStyle}
                    onValueChange={(v) => setForm({ ...form, battingStyle: v })}
                  >
                    <SelectTrigger className="h-10 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Right-hand bat" className="text-xs">Right-hand bat</SelectItem>
                      <SelectItem value="Left-hand bat" className="text-xs">Left-hand bat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Bowling Style</Label>
                  <Input
                    value={form.bowlingStyle}
                    onChange={(e) => setForm({ ...form, bowlingStyle: e.target.value })}
                    placeholder="e.g. Right-arm fast"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Photo URL (Optional)</Label>
                <Input
                  value={form.photoUrl}
                  onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                  placeholder="https://..."
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <DialogFooter className="pt-4 border-t gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={upsertMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  {upsertMutation.isPending ? "Saving..." : "Save Player"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Player from Team Confirmation Dialog */}
      <AlertDialog
        open={!!playerToRemove}
        onOpenChange={(open) => {
          if (!open && !removeMutation.isPending) {
            setPlayerToRemove(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-500">
              <ShieldAlert className="h-5 w-5" />
              Remove Player from Team?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2 text-xs text-left">
              <p className="text-foreground">
                Are you sure you want to remove{" "}
                <span className="font-bold text-foreground">{playerToRemove?.name}</span> from{" "}
                <span className="font-bold text-foreground">{activeTeam?.name}</span>'s active roster?
              </p>
              <div className="rounded-xl bg-muted/60 p-3.5 text-xs space-y-1.5 border border-border">
                <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 shrink-0" />
                  Past Stats & Scores are Preserved
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Removing this player only removes them from this team's active squad for future matches. Their profile, batting/bowling statistics, and scorecard history with this team will <strong>not</strong> be deleted from the database.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
            <AlertDialogCancel disabled={removeMutation.isPending} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (playerToRemove) {
                  removeMutation.mutate(playerToRemove.id);
                }
              }}
              disabled={removeMutation.isPending}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              {removeMutation.isPending ? "Removing..." : "Remove from Team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
