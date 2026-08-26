import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getTournament } from "@/lib/queries";
import { updateTournamentSettings } from "@/lib/mutations";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { useTournament } from "@/context/TournamentContext";

export default function AdminSettings() {
  const { tournamentId, tournament, isLoading } = useTournament();

  const [form, setForm] = useState({
    name: "",
    shortName: "",
    winPoints: "2",
    tiePoints: "1",
    noResultPoints: "1",
    lossPoints: "0",
    oversPerSide: "4",
  });

  useEffect(() => {
    if (tournament) {
      setForm({
        name: tournament.name,
        shortName: tournament.shortName ?? "",
        winPoints: String(tournament.winPoints),
        tiePoints: String(tournament.tiePoints),
        noResultPoints: String(tournament.noResultPoints),
        lossPoints: String(tournament.lossPoints),
        oversPerSide: String(tournament.oversPerSide),
      });
    }
  }, [tournament]);

  const save = useMutation({
    mutationFn: (args: Parameters<typeof updateTournamentSettings>[0]) =>
      updateTournamentSettings({ ...args, tournamentId }),
    onSuccess: () => {
      toast.success("Settings updated — standings recalculated with new values");
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournament"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["standings", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["standings"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="m-6 h-96 max-w-xl" />;

  const field = (
    key: keyof typeof form,
    label: string,
    type: "text" | "number" = "text",
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Tournament Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {field("name", "Tournament name")}
          {field("shortName", "Short name")}
          {field("oversPerSide", "Overs per side", "number")}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Points System</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {field("winPoints", "Win", "number")}
          {field("tiePoints", "Tie", "number")}
          {field("noResultPoints", "No Result", "number")}
          {field("lossPoints", "Loss", "number")}
        </CardContent>
      </Card>

      <Button
        className="mt-6 w-full"
        disabled={save.isPending || !form.name}
        onClick={() =>
          save.mutate({
            name: form.name,
            shortName: form.shortName || undefined,
            winPoints: Number(form.winPoints) || 0,
            tiePoints: Number(form.tiePoints) || 0,
            noResultPoints: Number(form.noResultPoints) || 0,
            lossPoints: Number(form.lossPoints) || 0,
            oversPerSide: Number(form.oversPerSide) || 10,
          })
        }
      >
        Save Settings
      </Button>
      <p className="text-xs text-muted-foreground mt-3">
        Changing points or overs-per-side recalculates the entire points table and
        NRR from the raw match data.
      </p>
    </div>
  );
}
