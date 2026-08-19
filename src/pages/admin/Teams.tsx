import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getTeams } from "@/lib/queries";
import { upsertTeam } from "@/lib/mutations";
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
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";

type TeamForm = {
  id?: string;
  name: string;
  shortName: string;
  groupName: "A" | "B";
  logoUrl: string;
};

const emptyForm: TeamForm = { name: "", shortName: "", groupName: "A", logoUrl: "" };

export default function AdminTeams() {
  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TeamForm>(emptyForm);

  const upsert = useMutation({
    mutationFn: (args: Parameters<typeof upsertTeam>[0]) => upsertTeam(args),
    onSuccess: () => {
      toast.success("Team saved");
      setOpen(false);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams</h1>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Team
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>Short</TableHead>
              <TableHead>Group</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>Loading…</TableCell>
                </TableRow>
              ))}
            {teams?.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <TeamBadge shortName={t.shortName} logoUrl={t.logoUrl} size="sm" />
                    <span className="font-medium">{t.name}</span>
                  </div>
                </TableCell>
                <TableCell>{t.shortName}</TableCell>
                <TableCell>Group {t.groupName}</TableCell>
                <TableCell>
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
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
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
              />
            </div>
            <div className="space-y-2">
              <Label>Short name (e.g. WOL)</Label>
              <Input
                value={form.shortName}
                onChange={(e) => setForm({ ...form, shortName: e.target.value })}
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
