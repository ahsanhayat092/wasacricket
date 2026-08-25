import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getSchedule, getTeams } from "@/lib/queries";
import {
  createMatch,
  updateMatchDetails,
  deleteMatch,
  autoGenerateSchedule,
} from "@/lib/mutations";
import { useEffect, useState } from "react";
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
import { statusBadgeClass, type MatchStatus } from "@/lib/cricket";
import { toast } from "sonner";
import { Plus, Sparkles, Trash2, Calendar, Clock, MapPin, FileDown, Loader2 } from "lucide-react";
import { downloadSchedulePDF } from "@/lib/pdf-export";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import type { HydratedMatch, Team } from "@/lib/firestore";

type MatchForm = {
  matchNumber: number;
  stage: "LEAGUE" | "PLAYOFF" | "FINAL";
  day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  teamAId: string;
  teamBId: string;
  date: string;
  time: string;
  venue: string;
};

const defaultForm: MatchForm = {
  matchNumber: 1,
  stage: "LEAGUE",
  day: "MONDAY",
  teamAId: "",
  teamBId: "",
  date: "24 August",
  time: "9:00 PM",
  venue: "Askari XI, Lahore",
};

export default function AdminSchedule() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["schedule"],
    queryFn: getSchedule,
  });
  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
  });

  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState<MatchForm>(defaultForm);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["schedule"] });
    queryClient.invalidateQueries({ queryKey: ["standings"] });
    queryClient.invalidateQueries({ queryKey: ["overview"] });
  };

  const create = useMutation({
    mutationFn: (args: MatchForm) =>
      createMatch({
        ...args,
        teamAId: args.teamAId || null,
        teamBId: args.teamBId || null,
      }),
    onSuccess: () => {
      toast.success("Match fixture created");
      setOpenCreate(false);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: (args: Parameters<typeof updateMatchDetails>[0]) =>
      updateMatchDetails(args),
    onSuccess: () => {
      toast.success("Match updated");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteMatch(id),
    onSuccess: () => {
      toast.success("Match fixture deleted");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const autoGen = useMutation({
    mutationFn: () => autoGenerateSchedule(),
    onSuccess: (r) => {
      toast.success(`Generated ${r.count} match fixtures!`);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const nextMatchNumber = (matches?.length ?? 0) + 1;

  const handleOpenAdd = () => {
    setForm({
      ...defaultForm,
      matchNumber: nextMatchNumber,
      teamAId: teams?.[0]?.id ?? "",
      teamBId: teams?.[1]?.id ?? "",
    });
    setOpenCreate(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Schedule & Fixtures</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create match fixtures, set dates, times, and venues.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {matches && matches.length > 0 && (
            <Button
              variant="outline"
              disabled={isDownloadingPdf}
              onClick={async () => {
                try {
                  setIsDownloadingPdf(true);
                  await downloadSchedulePDF(matches as HydratedMatch[]);
                  toast.success("Schedule PDF downloaded successfully!");
                } catch (err) {
                  console.error("PDF Download error:", err);
                  toast.error("Failed to generate Schedule PDF.");
                } finally {
                  setIsDownloadingPdf(false);
                }
              }}
              className="gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-bold"
            >
              {isDownloadingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              ) : (
                <FileDown className="h-4 w-4 text-emerald-400" />
              )}
              Download PDF
            </Button>
          )}
          {(!matches || matches.length === 0) && (teams?.length ?? 0) >= 2 && (
            <Button
              variant="outline"
              disabled={autoGen.isPending}
              onClick={() => autoGen.mutate()}
              className="gap-1.5"
            >
              <Sparkles className="h-4 w-4 text-amber-500" /> Auto-Generate Schedule
            </Button>
          )}
          <Button onClick={handleOpenAdd} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Match Fixture
          </Button>
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Match #</TableHead>
              <TableHead>Stage / Day</TableHead>
              <TableHead>Teams</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading schedule…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (!matches || matches.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  No match fixtures scheduled yet. Click <strong>"Add Match Fixture"</strong> or <strong>"Auto-Generate Schedule"</strong> to create the tournament timetable.
                </TableCell>
              </TableRow>
            )}
            {matches?.map((m) => (
              <ScheduleRow
                key={m.id}
                match={m}
                teams={teams ?? []}
                saving={update.isPending}
                deleting={del.isPending}
                onSave={(v) => update.mutate({ matchId: m.id, ...v })}
                onDelete={() => {
                  if (confirm(`Delete Match ${m.matchNumber}?`)) {
                    del.mutate(m.id);
                  }
                }}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Match Modal Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Match Fixture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Match #</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.matchNumber}
                  onChange={(e) =>
                    setForm({ ...form, matchNumber: Number(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select
                  value={form.stage}
                  onValueChange={(v) =>
                    setForm({ ...form, stage: v as "LEAGUE" | "PLAYOFF" | "FINAL" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEAGUE">League Stage</SelectItem>
                    <SelectItem value="PLAYOFF">⚔️ Playoff (Rank 2 vs 3)</SelectItem>
                    <SelectItem value="FINAL">🏆 Grand Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Day of Tournament</Label>
              <Select
                value={form.day}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    day: v as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY",
                    date: (v === "MONDAY" || v === "WEDNESDAY" || v === "FRIDAY") ? "24 August" : "25 August",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONDAY">Day 1 — Monday (24 August)</SelectItem>
                  <SelectItem value="TUESDAY">Day 2 — Tuesday (25 August)</SelectItem>
                  <SelectItem value="WEDNESDAY">Wednesday (26 August)</SelectItem>
                  <SelectItem value="THURSDAY">Thursday (27 August)</SelectItem>
                  <SelectItem value="FRIDAY">Friday (28 August)</SelectItem>
                  <SelectItem value="SATURDAY">Saturday (29 August)</SelectItem>
                  <SelectItem value="SUNDAY">Sunday (Finals)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Team A</Label>
                <Select
                  value={form.teamAId || "__TBD__"}
                  onValueChange={(v) => setForm({ ...form, teamAId: v === "__TBD__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        form.stage === "FINAL"
                          ? "TBD (Rank 1 - Auto)"
                          : form.stage === "PLAYOFF"
                            ? "TBD (Rank 2 - Auto)"
                            : "Select team"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__TBD__">TBD (Auto-assign)</SelectItem>
                    {teams?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team B</Label>
                <Select
                  value={form.teamBId || "__TBD__"}
                  onValueChange={(v) => setForm({ ...form, teamBId: v === "__TBD__" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        form.stage === "FINAL"
                          ? "TBD (Playoff Winner - Auto)"
                          : form.stage === "PLAYOFF"
                            ? "TBD (Rank 3 - Auto)"
                            : "Select team"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__TBD__">TBD (Auto-assign)</SelectItem>
                    {teams?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <DatePicker
                  date={form.date}
                  onChange={(d, dayOfWeek) =>
                    setForm({
                      ...form,
                      date: d,
                      ...(dayOfWeek ? { day: dayOfWeek } : {}),
                    })
                  }
                  className="w-full h-9 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <TimePicker
                  time={form.time}
                  onChange={(t) => setForm({ ...form, time: t })}
                  className="w-full h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Venue</Label>
              <Input
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                placeholder="Askari XI, Lahore"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenCreate(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={create.isPending}
              onClick={() => create.mutate(form)}
            >
              Create Fixture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScheduleRow({
  match,
  teams,
  saving,
  deleting,
  onSave,
  onDelete,
}: {
  match: HydratedMatch;
  teams: Team[];
  saving: boolean;
  deleting: boolean;
  onSave: (v: {
    matchNumber?: number;
    stage?: "LEAGUE" | "PLAYOFF" | "FINAL";
    day?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
    date?: string;
    time?: string;
    venue?: string;
    teamAId?: string | null;
    teamBId?: string | null;
  }) => void;
  onDelete: () => void;
}) {
  const [matchNumber, setMatchNumber] = useState<number>(match.matchNumber);
  const [stage, setStage] = useState<"LEAGUE" | "PLAYOFF" | "FINAL">(match.stage);
  const [day, setDay] = useState<"MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY">(
    match.day as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY",
  );
  const [date, setDate] = useState(match.date ?? "");
  const [time, setTime] = useState(match.time ?? "");
  const [venue, setVenue] = useState(match.venue ?? "");
  const [teamAId, setTeamAId] = useState<string | null>(match.teamA?.id ?? null);
  const [teamBId, setTeamBId] = useState<string | null>(match.teamB?.id ?? null);

  useEffect(() => {
    setMatchNumber(match.matchNumber);
    setStage(match.stage);
    setDay(match.day as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY");
    setDate(match.date ?? "");
    setTime(match.time ?? "");
    setVenue(match.venue ?? "");
    setTeamAId(match.teamA?.id ?? null);
    setTeamBId(match.teamB?.id ?? null);
  }, [match.id, match.matchNumber, match.stage, match.day, match.date, match.time, match.venue, match.teamA?.id, match.teamB?.id]);

  const isPlayoff = stage === "PLAYOFF";
  const isFinal = stage === "FINAL";
  const teamsEditable = match.status === "UPCOMING";

  return (
    <TableRow>
      <TableCell className="w-16">
        <Input
          type="number"
          min={1}
          value={matchNumber}
          onChange={(e) => setMatchNumber(Number(e.target.value) || 1)}
          className="w-14 h-8 text-xs font-bold text-center p-1"
        />
      </TableCell>
      <TableCell className="min-w-44">
        <div className="flex flex-col gap-1.5">
          <Select
            value={day}
            onValueChange={(v) => {
              const newDay = v as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
              setDay(newDay);
              if (!date || date === "24 August" || date === "25 August" || date === "26 August" || date === "27 August") {
                setDate((newDay === "MONDAY" || newDay === "WEDNESDAY" || newDay === "FRIDAY") ? "24 August" : "25 August");
              }
            }}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONDAY">Day 1 (Mon 24 Aug)</SelectItem>
              <SelectItem value="TUESDAY">Day 2 (Tue 25 Aug)</SelectItem>
              <SelectItem value="WEDNESDAY">Day 1 (24 Aug)</SelectItem>
              <SelectItem value="THURSDAY">Day 2 (25 Aug)</SelectItem>
              <SelectItem value="FRIDAY">Friday</SelectItem>
              <SelectItem value="SATURDAY">Saturday</SelectItem>
              <SelectItem value="SUNDAY">Sunday (Finals)</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={stage}
            onValueChange={(v) => setStage(v as "LEAGUE" | "PLAYOFF" | "FINAL")}
          >
            <SelectTrigger className="w-36 h-7 text-[11px] text-muted-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LEAGUE">League Match</SelectItem>
              <SelectItem value="PLAYOFF">⚔️ Playoff</SelectItem>
              <SelectItem value="FINAL">🏆 Grand Final</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </TableCell>
      <TableCell className="min-w-56">
        {teamsEditable ? (
          <div className="flex items-center gap-1.5">
            <Select
              value={teamAId ?? "__TBD__"}
              onValueChange={(v) => setTeamAId(v === "__TBD__" ? null : (v || null))}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue
                  placeholder={
                    isFinal
                      ? "TBD (Rank 1)"
                      : isPlayoff
                        ? "TBD (Rank 2)"
                        : "TBD"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__TBD__">
                  {isFinal
                    ? "TBD (Rank 1 - Auto)"
                    : isPlayoff
                      ? "TBD (Rank 2 - Auto)"
                      : "TBD (Unassigned)"}
                </SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">vs</span>
            <Select
              value={teamBId ?? "__TBD__"}
              onValueChange={(v) => setTeamBId(v === "__TBD__" ? null : (v || null))}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue
                  placeholder={
                    isFinal
                      ? "TBD (Playoff Winner)"
                      : isPlayoff
                        ? "TBD (Rank 3)"
                        : "TBD"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__TBD__">
                  {isFinal
                    ? "TBD (Playoff Winner - Auto)"
                    : isPlayoff
                      ? "TBD (Rank 3 - Auto)"
                      : "TBD (Unassigned)"}
                </SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span className="font-medium text-sm">
            {match.teamA?.name ?? (isFinal ? "TBD (Rank 1)" : isPlayoff ? "TBD (Rank 2)" : "TBD")} vs{" "}
            {match.teamB?.name ?? (isFinal ? "TBD (Playoff Winner)" : isPlayoff ? "TBD (Rank 3)" : "TBD")}
          </span>
        )}
      </TableCell>
      <TableCell>
        <DatePicker
          date={date}
          size="sm"
          onChange={(d, dayOfWeek) => {
            setDate(d);
            if (dayOfWeek) setDay(dayOfWeek);
          }}
          className="w-36 h-8 text-xs font-medium"
        />
      </TableCell>
      <TableCell>
        <TimePicker
          time={time}
          size="sm"
          onChange={(t) => setTime(t)}
          className="w-28 h-8 text-xs font-medium"
        />
      </TableCell>
      <TableCell>
        <Input
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="Askari XI"
          className="w-36 h-8 text-xs"
        />
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={statusBadgeClass(match.status as MatchStatus)}
        >
          {match.status.replace("_", " ")}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() =>
              onSave({
                matchNumber,
                stage,
                day,
                date,
                time,
                venue,
                ...(teamsEditable ? { teamAId, teamBId } : {}),
              })
            }
          >
            Save
          </Button>
          {match.status === "UPCOMING" && (
            <Button
              size="icon"
              variant="ghost"
              disabled={deleting}
              onClick={onDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
