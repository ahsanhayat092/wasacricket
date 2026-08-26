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
          {rows.map((s) => {
            const status = s.qualificationStatus;
            const isEliminated = status === "ELIMINATED" || s.eliminated;
            const isQualifiedFinal = status === "QUALIFIED_FINAL";
            const isQualifiedPlayoff = status === "QUALIFIED_PLAYOFF";
            const isQualifiedTop3 = status === "QUALIFIED_TOP3" || s.guaranteedTop3;

            return (
              <TableRow
                key={s.teamId}
                className={cn(
                  isQualifiedFinal && "bg-amber-500/5 border-l-2 border-l-amber-500",
                  (isQualifiedPlayoff || isQualifiedTop3) && "bg-purple-500/5 border-l-2 border-l-purple-500",
                  isEliminated && "opacity-75 bg-muted/10",
                  !status && s.position === 1 && "bg-amber-500/[0.02]",
                )}
              >
                <TableCell className="font-bold">
                  {s.position === 1 ? "🥇" : s.position === 2 ? "🥈" : s.position === 3 ? "🥉" : s.position}
                </TableCell>
                <TableCell>
                  <Link
                    to={`/teams/${s.teamId}`}
                    className="flex items-center gap-2 hover:text-primary flex-wrap"
                  >
                    <TeamBadge
                      shortName={s.team?.shortName}
                      logoUrl={s.team?.logoUrl}
                      size="sm"
                    />
                    <span className={cn("font-medium", isEliminated && "line-through text-muted-foreground")}>
                      {s.team?.name}
                    </span>

                    {/* Mathematically derived Scenario Badges */}
                    {isQualifiedFinal && (
                      <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold hover:bg-amber-500/30">
                        🏆 GRAND FINAL (Q)
                      </Badge>
                    )}
                    {isQualifiedPlayoff && (
                      <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/40 text-[10px] font-bold hover:bg-purple-500/30">
                        ⚔️ PLAYOFF (Q)
                      </Badge>
                    )}
                    {!isQualifiedFinal && !isQualifiedPlayoff && isQualifiedTop3 && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold hover:bg-emerald-500/30">
                        🟢 TOP 3 (Q)
                      </Badge>
                    )}
                    {isEliminated && (
                      <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px] font-bold">
                        🔴 ELIMINATED
                      </Badge>
                    )}
                  </Link>
                </TableCell>
                <TableCell className="text-center">{s.played}</TableCell>
                <TableCell className="text-center">{s.won}</TableCell>
                <TableCell className="text-center">{s.lost}</TableCell>
                {!compact && <TableCell className="text-center">{s.tied}</TableCell>}
                {!compact && <TableCell className="text-center">{s.noResult}</TableCell>}
                <TableCell className="text-center font-bold">{s.points ?? 0}</TableCell>
                <TableCell
                  className={cn(
                    "text-center font-mono",
                    (s.nrr ?? 0) > 0
                      ? "text-emerald-500"
                      : (s.nrr ?? 0) < 0
                        ? "text-red-500"
                        : "text-muted-foreground",
                  )}
                >
                  {fmtNrr(s.nrr)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {!compact && (
        <div className="p-3 bg-muted/20 border-t flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-muted-foreground">
          {rows.some((r) => r.qualificationStatus === "QUALIFIED_PLAYOFF") ? (
            <>
              <span className="flex items-center gap-1.5 font-medium text-amber-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span><strong>Rank 1</strong>: Direct Grand Final Spot</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium text-purple-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span><strong>Rank 2 & 3</strong>: Playoff Eliminator Spot</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium text-rose-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span><strong>Eliminated</strong>: Cannot mathematically reach Top 3</span>
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 font-medium text-amber-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span><strong>Rank 1 & 2</strong>: Direct Grand Finalists</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium text-rose-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span><strong>Eliminated</strong>: Cannot reach Top 2</span>
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
