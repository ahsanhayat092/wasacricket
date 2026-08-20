import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getTeams, getPlayers } from "@/lib/queries";
import { upsertPlayer, deletePlayer } from "@/lib/mutations";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Crown, Pencil, Plus, Trash2, Shield, User, Star } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { Player } from "@/lib/firestore";

type Role = "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";
type Designation = "Captain" | "Vice Captain" | "Team Member";

type PlayerForm = {
  id?: string;
  teamId: string | null;
  name: string;
  jerseyNumber: string;
  role: Role;
  designation: Designation;
  battingStyle: string;
  bowlingStyle: string;
  photoUrl: string;
};

const emptyForm: PlayerForm = {
  teamId: null,
  name: "",
  jerseyNumber: "",
  role: "Batsman",
  designation: "Team Member",
  battingStyle: "",
  bowlingStyle: "",
  photoUrl: "",
};

export default function AdminPlayers() {
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: getTeams });
  const { data: allPlayers } = useQuery({ queryKey: ["players"], queryFn: getPlayers });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PlayerForm>(emptyForm);
  const [filterTeam, setFilterTeam] = useState<string>("all");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["players"] });
    queryClient.invalidateQueries({ queryKey: ["teams"] });
  };

  const upsert = useMutation({
    mutationFn: (args: PlayerForm) =>
      upsertPlayer({
        id: args.id,
        teamId: args.teamId!,
        name: args.name,
        jerseyNumber: args.jerseyNumber ? Number(args.jerseyNumber) : undefined,
        role: args.role,
        isCaptain: args.designation === "Captain",
        isViceCaptain: args.designation === "Vice Captain",
        designation: args.designation,
        battingStyle: args.battingStyle || undefined,
        bowlingStyle: args.bowlingStyle || undefined,
        photoUrl: args.photoUrl.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Player profile saved");
      setOpen(false);
      setForm(emptyForm);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const setDesignationDirectly = useMutation({
    mutationFn: (args: { player: Player; designation: Designation }) =>
      upsertPlayer({
        id: args.player.id,
        teamId: args.player.teamId,
        name: args.player.name,
        jerseyNumber: args.player.jerseyNumber ?? undefined,
        role: args.player.role,
        isCaptain: args.designation === "Captain",
        isViceCaptain: args.designation === "Vice Captain",
        designation: args.designation,
        battingStyle: args.player.battingStyle ?? undefined,
        bowlingStyle: args.player.bowlingStyle ?? undefined,
      }),
    onSuccess: (_, variables) => {
      toast.success(
        `${variables.player.name} is now ${variables.designation === "Captain" ? "👑 Captain" : variables.designation === "Vice Captain" ? "🛡️ Vice-Captain" : "Team Member"}`,
      );
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deletePlayer(id),
    onSuccess: () => {
      toast.success("Player deleted");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const playersWithTeam = useMemo(
    () =>
      (allPlayers ?? []).map((p) => ({
        ...p,
        teamName: teams?.find((t) => t.id === p.teamId)?.name ?? "",
      })),
    [allPlayers, teams],
  );

  const filtered =
    filterTeam === "all"
      ? playersWithTeam
      : playersWithTeam.filter((p) => p.teamId === filterTeam);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">Squad Players & Captains</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assign Team Captains (C), Vice-Captains (VC), and manage squad rosters.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterTeam} onValueChange={setFilterTeam}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🌐 All teams</SelectItem>
              {teams?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setForm({
                ...emptyForm,
                teamId: teams?.[0]?.id ?? null,
              });
              setOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Player
          </Button>
        </div>
      </div>

      {/* Players List Table */}
      <div className="rounded-xl border overflow-x-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Player Name</TableHead>
              <TableHead>Squad Designation</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Playing Role</TableHead>
              <TableHead>Batting / Bowling Style</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const isCap = p.isCaptain || p.designation === "Captain";
              const isVc = p.isViceCaptain || p.designation === "Vice Captain";

              return (
                <TableRow key={p.id} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-center text-muted-foreground font-bold">
                    {p.jerseyNumber ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="sm" />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm">{p.name}</span>
                          {isCap && (
                            <Badge className="bg-amber-600 hover:bg-amber-600 text-white text-[10px] gap-1 px-1.5 py-0 font-bold">
                              <Crown className="h-3 w-3" /> Captain (C)
                            </Badge>
                          )}
                          {isVc && (
                            <Badge className="bg-sky-600 hover:bg-sky-600 text-white text-[10px] gap-1 px-1.5 py-0 font-bold">
                              <Shield className="h-3 w-3" /> Vice-Captain (VC)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={
                        isCap
                          ? "Captain"
                          : isVc
                            ? "Vice Captain"
                            : "Team Member"
                      }
                      onValueChange={(v) =>
                        setDesignationDirectly.mutate({
                          player: p,
                          designation: v as Designation,
                        })
                      }
                      disabled={setDesignationDirectly.isPending}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Captain">👑 Captain (C)</SelectItem>
                        <SelectItem value="Vice Captain">🛡️ Vice-Captain</SelectItem>
                        <SelectItem value="Team Member">👤 Team Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{p.teamName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {p.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.battingStyle || p.bowlingStyle ? (
                      <span>
                        {p.battingStyle || "—"} · {p.bowlingStyle || "—"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const des: Designation =
                            p.isCaptain || p.designation === "Captain"
                              ? "Captain"
                              : p.isViceCaptain || p.designation === "Vice Captain"
                                ? "Vice Captain"
                                : "Team Member";

                          setForm({
                            id: p.id,
                            teamId: p.teamId,
                            name: p.name,
                            jerseyNumber: p.jerseyNumber?.toString() ?? "",
                            role: p.role,
                            designation: des,
                            battingStyle: p.battingStyle ?? "",
                            bowlingStyle: p.bowlingStyle ?? "",
                            photoUrl: p.photoUrl ?? "",
                          });
                          setOpen(true);
                        }}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Delete ${p.name}?`)) del.mutate(p.id);
                        }}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No players found. Add players to teams.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Player Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Player Profile" : "Add Player to Team"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Team</Label>
              <Select
                value={form.teamId ?? undefined}
                onValueChange={(v) => setForm({ ...form, teamId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Player Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Babar Azam"
              />
            </div>

            {/* Player Photo URL & Live Preview */}
            <div className="space-y-2">
              <Label>Player Photo URL (Optional)</Label>
              <div className="flex items-center gap-3">
                <PlayerAvatar name={form.name || "Player"} photoUrl={form.photoUrl} size="lg" />
                <div className="flex-1 space-y-1">
                  <Input
                    value={form.photoUrl}
                    onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                    placeholder="https://example.com/photos/babar.jpg"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Provide an image URL (PNG, JPG, WebP) for profile pictures.
                  </p>
                </div>
              </div>
            </div>

            {/* Squad Designation (Captain / Vice Captain / Member) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Squad Designation</Label>
                <Select
                  value={form.designation}
                  onValueChange={(v) =>
                    setForm({ ...form, designation: v as Designation })
                  }
                >
                  <SelectTrigger className="font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Captain">👑 Captain (C)</SelectItem>
                    <SelectItem value="Vice Captain">🛡️ Vice-Captain (VC)</SelectItem>
                    <SelectItem value="Team Member">👤 Team Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Jersey # (Optional)</Label>
                <Input
                  type="number"
                  value={form.jerseyNumber}
                  onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })}
                  placeholder="56"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Primary Playing Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as Role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Batsman">Batsman</SelectItem>
                  <SelectItem value="Bowler">Bowler</SelectItem>
                  <SelectItem value="All-rounder">All-rounder</SelectItem>
                  <SelectItem value="Wicketkeeper">Wicketkeeper</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Batting Style</Label>
                <Input
                  value={form.battingStyle}
                  onChange={(e) => setForm({ ...form, battingStyle: e.target.value })}
                  placeholder="Right-hand bat"
                />
              </div>
              <div className="space-y-2">
                <Label>Bowling Style</Label>
                <Input
                  value={form.bowlingStyle}
                  onChange={(e) => setForm({ ...form, bowlingStyle: e.target.value })}
                  placeholder="Right-arm fast"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={upsert.isPending || !form.name || !form.teamId}
              onClick={() => upsert.mutate(form)}
            >
              {form.id ? "Save Player" : "Add Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
