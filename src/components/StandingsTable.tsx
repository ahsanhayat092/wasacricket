import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/TeamBadge";
import { fmtNrr } from "@/lib/cricket";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import type { StandingWithTeam } from "@/lib/firestore";

export function StandingsTable({
  rows,
  compact = false,
}: {
  rows: StandingWithTeam[];
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border overflow-hidden overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">POS</TableHead>
            <TableHead>TEAM</TableHead>
            <TableHead className="text-center">P</TableHead>
            <TableHead className="text-center">W</TableHead>
            <TableHead className="text-center">L</TableHead>
            {!compact && <TableHead className="text-center">T</TableHead>}
            {!compact && <TableHead className="text-center">NR</TableHead>}
            <TableHead className="text-center font-bold">PTS</TableHead>
            <TableHead className="text-center">NRR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow
              key={s.teamId}
              className={cn(
                s.qualified &&
                  "bg-emerald-500/5 border-l-2 border-l-emerald-500",
              )}
            >
              <TableCell className="font-bold">
                {s.position === 1 ? "🥇" : s.position === 2 ? "🥈" : s.position}
              </TableCell>
              <TableCell>
                <Link
                  to={`/teams/${s.teamId}`}
                  className="flex items-center gap-2 hover:text-primary"
                >
                  <TeamBadge
                    shortName={s.team?.shortName}
                    logoUrl={s.team?.logoUrl}
                    size="sm"
                  />
                  <span className="font-medium">{s.team?.name}</span>
                  {s.qualified && (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[10px]">
                      QUALIFIED
                    </Badge>
                  )}
                </Link>
              </TableCell>
              <TableCell className="text-center">{s.played}</TableCell>
              <TableCell className="text-center">{s.won}</TableCell>
              <TableCell className="text-center">{s.lost}</TableCell>
              {!compact && <TableCell className="text-center">{s.tied}</TableCell>}
              {!compact && <TableCell className="text-center">{s.noResult}</TableCell>}
              <TableCell className="text-center font-bold">{s.points}</TableCell>
              <TableCell
                className={cn(
                  "text-center font-mono",
                  s.nrr > 0
                    ? "text-emerald-500"
                    : s.nrr < 0
                      ? "text-red-500"
                      : "text-muted-foreground",
                )}
              >
                {fmtNrr(s.nrr)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
