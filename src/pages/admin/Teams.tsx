import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getTeams, getPlayers } from "@/lib/queries";
import { upsertTeam } from "@/lib/mutations";
import { useTournament } from "@/context/TournamentContext";
import { useState } from "react";
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
import { TeamBadge } from "@/components/TeamBadge";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Pencil, Plus, Users } from "lucide-react";
import { Link } from "react-router";

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

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams", tournamentId],
    queryFn: () => getTeams(tournamentId),
    staleTime: 30 * 1000,
  });
  const { data: players } = useQuery({
    queryKey: ["players"],
    queryFn: getPlayers,
    staleTime: 60 * 1000,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TeamForm>(emptyForm);

  const upsert = useMutation({
    mutationFn: (args: Parameters<typeof upsertTeam>[0]) =>
      upsertTeam({ ...args, tournamentId }),
    onSuccess: () => {
      toast.success("Team saved");
      setOpen(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["teams", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teams & Squads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage participating teams, logos, and assigned captains.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Team
        </Button>
      </div>

      <div className="rounded-lg border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Team</TableHead>
              <TableHead>Short</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Team Captain</TableHead>
              <TableHead>Squad Size</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
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
                      <span className="font-semibold">{t.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono font-medium">{t.shortName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Group {t.groupName}</Badge>
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
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
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
                        <span>Add Player</span>
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
                          groupName: t.groupName,
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
