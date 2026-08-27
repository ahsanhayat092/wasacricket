import React, { useState } from "react";
import { useTeam } from "@/context/TeamContext";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { upsertPlayer, deletePlayer } from "@/lib/mutations";
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["team_players", activeTeam?.id] });
    queryClient.invalidateQueries({ queryKey: ["players"] });
  };

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

  // Delete Player Mutation
  const deleteMutation = useMutation({
    mutationFn: (playerId: string) => deletePlayer(playerId),
    onSuccess: () => {
      toast.success("Player removed from team roster.");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Cannot delete player."),
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
                        onClick={() => {
                          if (confirm(`Remove ${p.name} from roster?`)) {
                            deleteMutation.mutate(p.id);
                          }
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                        title="Delete Player"
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
              {form.id ? "Edit Player" : "Add Player to Roster"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Player information for {activeTeam?.name}.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim()) {
                toast.error("Player name is required.");
                return;
              }
              upsertMutation.mutate(form);
            }}
            className="space-y-4 pt-2"
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
