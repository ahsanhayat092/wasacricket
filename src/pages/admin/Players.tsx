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
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Player } from "@/lib/firestore";

type Role = "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";

type PlayerForm = {
  id?: string;
  teamId: string | null;
  name: string;
  jerseyNumber: string;
  role: Role;
  battingStyle: string;
  bowlingStyle: string;
};

const emptyForm: PlayerForm = {
  teamId: null,
  name: "",
  jerseyNumber: "",
  role: "Batsman",
  battingStyle: "",
  bowlingStyle: "",
};

export default function AdminPlayers() {
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: getTeams });
  const { data: allPlayers } = useQuery({ queryKey: ["players"], queryFn: getPlayers });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PlayerForm>(emptyForm);
  const [filterTeam, setFilterTeam] = useState<string>("all");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["players"] });
  };

  const upsert = useMutation({
    mutationFn: (args: Parameters<typeof upsertPlayer>[0]) => upsertPlayer(args),
    onSuccess: () => {
      toast.success("Player saved");
      setOpen(false);
      setForm(emptyForm);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deletePlayer(id),
    onSuccess: () => { toast.success("Player deleted"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const playersWithTeam = useMemo(() =>
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Players</h1>
        <div className="flex items-center gap-3">
          <Select value={filterTeam} onValueChange={setFilterTeam}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setForm(emptyForm);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Player
          </Button>
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Batting</TableHead>
              <TableHead>Bowling</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.jerseyNumber ?? "—"}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.teamName}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{p.role}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.battingStyle ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.bowlingStyle ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setForm({
                          id: p.id,
                          teamId: p.teamId,
                          name: p.name,
                          jerseyNumber: p.jerseyNumber?.toString() ?? "",
                          role: p.role,
                          battingStyle: p.battingStyle ?? "",
                          bowlingStyle: p.bowlingStyle ?? "",
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete ${p.name}?`)) del.mutate(p.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No players yet. Add squad members to enable scorecard entry.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Player" : "Add Player"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Team</Label>
              <Select
                value={form.teamId ?? ""}
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
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jersey #</Label>
                <Input
                  type="number"
                  value={form.jerseyNumber}
                  onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as Role })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["Batsman", "Bowler", "All-rounder", "Wicketkeeper"] as Role[]).map(
                      (r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Batting style</Label>
              <Input
                value={form.battingStyle}
                onChange={(e) => setForm({ ...form, battingStyle: e.target.value })}
                placeholder="e.g. Right-hand bat"
              />
            </div>
            <div className="space-y-2">
              <Label>Bowling style</Label>
              <Input
                value={form.bowlingStyle}
                onChange={(e) => setForm({ ...form, bowlingStyle: e.target.value })}
                placeholder="e.g. Right-arm fast"
              />
            </div>
            <Button
              className="w-full"
              disabled={upsert.isPending || !form.name || !form.teamId}
              onClick={() =>
                upsert.mutate({
                  id: form.id,
                  teamId: form.teamId!,
                  name: form.name,
                  jerseyNumber: form.jerseyNumber ? Number(form.jerseyNumber) : undefined,
                  role: form.role,
                  battingStyle: form.battingStyle || undefined,
                  bowlingStyle: form.bowlingStyle || undefined,
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
