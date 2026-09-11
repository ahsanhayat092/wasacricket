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
import type { StandingWithTeam, PlayoffFormatType, TournamentStageFormat } from "@/lib/firestore";

interface StandingsTableProps {
  rows: StandingWithTeam[];
  compact?: boolean;
  playoffFormat?: PlayoffFormatType;
  stageFormat?: TournamentStageFormat;
  teamsPerGroupAdvance?: number;
  allLeagueMatchesCompleted?: boolean;
}

function RenderTableRows({
  groupRows,
  compact,
  playoffFormat,
  isGrouped,
  teamsPerGroupAdvance = 2,
  isLeagueComplete = false,
}: {
  groupRows: StandingWithTeam[];
  compact: boolean;
  playoffFormat: PlayoffFormatType;
  isGrouped: boolean;
  teamsPerGroupAdvance?: number;
  isLeagueComplete?: boolean;
}) {
  if (groupRows.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={compact ? 7 : 9} className="text-center py-6 text-xs text-muted-foreground italic">
            No teams assigned to this group yet.
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {groupRows.map((s) => {
        const cutoff = isGrouped
          ? teamsPerGroupAdvance
          : playoffFormat === "NONE"
            ? 1
            : playoffFormat === "PAGE_PLAYOFF_TOP3"
              ? 3
              : playoffFormat === "IPL_TOP4" || playoffFormat === "SEMI_FINALS"
                ? 4
                : 2;

        const isTopRanked = s.position <= cutoff;
        const isEliminated =
          isLeagueComplete &&
          !isTopRanked &&
          (s.qualificationStatus === "ELIMINATED" || s.eliminated);

        let badgeText: string | null = null;
        let badgeClass = "";

        // Only display Playoff and Grand Finale qualification badges after all teams have completed their league matches
        if (isLeagueComplete && !isEliminated) {
          if (isGrouped) {
            if (s.position <= teamsPerGroupAdvance) {
              if (teamsPerGroupAdvance === 1) {
                badgeText = "🏆 GRAND FINAL (Q)";
                badgeClass = "bg-amber-500/20 text-amber-400 border-amber-500/40";
              } else {
                badgeText = "🎯 SEMI-FINAL (Q)";
                badgeClass = "bg-blue-500/20 text-blue-400 border-blue-500/40";
              }
            }
          } else if (playoffFormat === "DIRECT_TOP2") {
            if (s.position <= 2) {
              badgeText = "🏆 GRAND FINAL (Q)";
              badgeClass = "bg-amber-500/20 text-amber-400 border-amber-500/40";
            }
          } else if (playoffFormat === "PAGE_PLAYOFF_TOP3") {
            if (s.position === 1) {
              badgeText = "🏆 GRAND FINAL (Q)";
              badgeClass = "bg-amber-500/20 text-amber-400 border-amber-500/40";
            } else if (s.position === 2 || s.position === 3) {
              badgeText = "⚔️ PLAYOFF (Q)";
              badgeClass = "bg-purple-500/20 text-purple-400 border-purple-500/40";
            }
          } else if (playoffFormat === "IPL_TOP4") {
            if (s.position <= 2) {
              badgeText = "🔥 QUALIFIER 1 (Q)";
              badgeClass = "bg-orange-500/20 text-orange-400 border-orange-500/40";
            } else if (s.position === 3 || s.position === 4) {
              badgeText = "⚔️ ELIMINATOR (Q)";
              badgeClass = "bg-purple-500/20 text-purple-400 border-purple-500/40";
            }
          } else if (playoffFormat === "SEMI_FINALS") {
            if (s.position <= 4) {
              badgeText = "🎯 SEMI-FINAL (Q)";
              badgeClass = "bg-blue-500/20 text-blue-400 border-blue-500/40";
            }
          } else if (playoffFormat === "NONE") {
            if (s.position === 1) {
              badgeText = "🏆 CHAMPION (Q)";
              badgeClass = "bg-amber-500/20 text-amber-400 border-amber-500/40";
            }
          }
        }

        return (
          <TableRow
            key={s.teamId}
            className={cn(
              badgeText && "bg-emerald-500/5 border-l-2 border-l-emerald-500",
              isEliminated && "opacity-75 bg-muted/10",
              !badgeText && s.position === 1 && "bg-amber-500/[0.02]",
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

                {badgeText && (
                  <Badge className={cn("text-[10px] font-bold border", badgeClass)}>
                    {badgeText}
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
  );
}

export function StandingsTable({
  rows,
  compact = false,
  playoffFormat = "DIRECT_TOP2",
  stageFormat,
  teamsPerGroupAdvance = 2,
  allLeagueMatchesCompleted,
}: StandingsTableProps) {
  const isLeagueComplete = Boolean(allLeagueMatchesCompleted);

  const distinctGroups = Array.from(
    new Set(
      rows
        .map((r) => (r.groupName || r.team?.groupName || "").trim().toUpperCase())
        .filter((g): g is string => Boolean(g)),
    ),
  ).sort();

  // Strict check: only render grouped view when stageFormat is explicitly GROUPS_AND_KNOCKOUT
  const isGrouped = stageFormat === "GROUPS_AND_KNOCKOUT";

  if (isGrouped) {
    if (!distinctGroups.includes("A")) distinctGroups.push("A");
    if (!distinctGroups.includes("B")) distinctGroups.push("B");
    distinctGroups.sort();

    return (
      <div className="space-y-6">
        {distinctGroups.map((groupName) => {
          const groupRows = rows.filter(
            (r) =>
              (r.groupName || r.team?.groupName || "A")
                .trim()
                .toUpperCase() === groupName,
          );
          return (
            <div key={groupName} className="rounded-lg border overflow-hidden bg-card/60 shadow-sm">
              <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-wide text-foreground">
                    🏆 Group {groupName} Standings
                  </span>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold">
                    {groupRows.length} Teams
                  </Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {isLeagueComplete ? (
                    `Top ${teamsPerGroupAdvance} advance to ${teamsPerGroupAdvance === 1 ? "Grand Final" : "Semi-Finals"}`
                  ) : (
                    `Group Stage in Progress`
                  )}
                </span>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
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
                  <RenderTableRows
                    groupRows={groupRows}
                    compact={compact}
                    playoffFormat={playoffFormat}
                    isGrouped={true}
                    teamsPerGroupAdvance={teamsPerGroupAdvance}
                    isLeagueComplete={isLeagueComplete}
                  />
                </Table>
              </div>
            </div>
          );
        })}

        {!compact && (
          <div className="p-3 bg-muted/20 border rounded-lg flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-muted-foreground">
            {isLeagueComplete ? (
              <>
                <span className="flex items-center gap-1.5 font-medium text-blue-400">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>
                    <strong>Top {teamsPerGroupAdvance}</strong>: Qualified for Cross-Group {teamsPerGroupAdvance === 1 ? "Grand Final" : "Semi-Finals"}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 font-medium text-rose-400">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span><strong>Eliminated</strong>: Did not qualify</span>
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                ℹ️ <span><strong>Group Stage in Progress</strong>: Official knockout spots will be awarded once all group matches are completed.</span>
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Single table default
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
        <RenderTableRows
          groupRows={rows}
          compact={compact}
          playoffFormat={playoffFormat}
          isGrouped={false}
          isLeagueComplete={isLeagueComplete}
        />
      </Table>

      {!compact && (
        <div className="p-3 bg-muted/20 border-t flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-muted-foreground">
          {isLeagueComplete ? (
            playoffFormat === "PAGE_PLAYOFF_TOP3" ? (
              <>
                <span className="flex items-center gap-1.5 font-medium text-amber-400">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span><strong>Rank 1</strong>: Direct Grand Final Spot</span>
                </span>
                <span className="flex items-center gap-1.5 font-medium text-purple-400">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span><strong>Rank 2 & 3</strong>: Playoff Spot</span>
                </span>
                <span className="flex items-center gap-1.5 font-medium text-rose-400">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span><strong>Eliminated</strong>: Did not qualify</span>
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5 font-medium text-amber-400">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span><strong>Top Ranked</strong>: Advanced to Playoffs</span>
                </span>
                <span className="flex items-center gap-1.5 font-medium text-rose-400">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span><strong>Eliminated</strong>: Did not qualify</span>
                </span>
              </>
            )
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              ℹ️ <span><strong>League Stage in Progress</strong>: Playoff and Grand Final spots will be decided upon completion of all league matches.</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
