import React from "react";
import { Link, useNavigate } from "react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getUserTournaments } from "@/lib/queries";
import { deleteTournament } from "@/lib/mutations";
import { queryClient } from "@/providers/trpc";
import { useTournament } from "@/context/TournamentContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Plus,
  ExternalLink,
  Calendar,
  Layers,
  MapPin,
  CheckCircle2,
  Trash2,
  Sparkles,
  Share2,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function TournamentsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tournamentId, setTournamentId } = useTournament();

  const isSuperAdmin = user?.email?.toLowerCase() === "ahsanhayat092@gmail.com";

  const { data: tournaments, isLoading } = useQuery({
    queryKey: ["user_tournaments", user?.uid, user?.email],
    queryFn: () => getUserTournaments(user?.email, user?.uid),
  });

  const deleteMutation = useMutation({
    mutationFn: (tId: string) => deleteTournament(tId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast.success("Tournament deleted successfully.");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to delete tournament.");
    },
  });

  const handleCopyLink = (slug?: string, id?: string) => {
    const url = `${window.location.origin}/t/${slug || id || "wasa-2026"}`;
    navigator.clipboard.writeText(url);
    toast.success(`Public URL copied: ${url}`);
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Trophy className="h-7 w-7 text-emerald-500" /> Cricket Tournaments Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your tournaments, launch new corporate/tape-ball events, and access public live score portals.
          </p>
        </div>
        <Link to="/admin/tournaments/new">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 shadow-md">
            <Plus className="h-4 w-4" /> Create New Tournament
          </Button>
        </Link>
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && (
          <div className="col-span-3 text-center py-12 text-muted-foreground text-sm">
            Loading tournaments...
          </div>
        )}

        {tournaments?.map((t) => {
          const isActive = t.id === tournamentId;
          const publicUrl = `/t/${t.slug || t.id}`;

          return (
            <Card
              key={t.id}
              className={`relative overflow-hidden transition-all flex flex-col justify-between border-2 ${
                isActive
                  ? "border-emerald-500 bg-emerald-500/[0.03] shadow-lg ring-1 ring-emerald-500/30"
                  : "border-border/60 hover:border-border hover:shadow-md"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                  Active Workspace
                </div>
              )}

              <CardHeader className="pb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-xs">
                    {t.shortName || "CRIC"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-extrabold truncate">
                      {t.name}
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-emerald-500" /> {t.venueName || "Lahore, Pakistan"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {t.oversPerSide || 4} Overs
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {(t.formatType || "TAPE_BALL_INDOOR").replace(/_/g, " ")}
                  </Badge>
                  <Badge
                    className={`text-[10px] font-bold ${
                      (t.status || "").toUpperCase() === "COMPLETED"
                        ? "bg-muted/80 text-muted-foreground border-border"
                        : (t.status || "").toUpperCase() === "UPCOMING"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {t.status || "ACTIVE"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-2 border-t">
                {t.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Scorer PIN</span>
                    <span className="font-mono font-bold">{t.scorerPin || "1234"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Playoffs</span>
                    <span className="font-semibold text-foreground truncate block">
                      {(t.playoffFormat || "DIRECT_TOP2").replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      className={`text-xs font-bold ${
                        isActive ? "bg-emerald-600 text-white" : ""
                      }`}
                      onClick={() => {
                        setTournamentId(t.id);
                        toast.success(`Switched active workspace to "${t.name}"`);
                        navigate("/admin");
                      }}
                    >
                      {isActive ? "Active Admin" : "Manage"}
                    </Button>

                    <Link to={publicUrl} target="_blank">
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="View Public Portal">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Share Public Link"
                      onClick={() => handleCopyLink(t.slug, t.id)}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {(isSuperAdmin || (t.id !== "main" && (t.ownerId === user?.uid || (t.ownerEmail && t.ownerEmail.toLowerCase() === user?.email?.toLowerCase())))) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                      title="Delete Tournament"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm(`Are you sure you want to permanently delete tournament "${t.name}"? This action will remove all fixtures, squads, and standings.`)) {
                          deleteMutation.mutate(t.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!isLoading && (!tournaments || tournaments.length === 0) && (
          <div className="col-span-3">
            <Card className="p-12 text-center space-y-6 border-dashed border-2 bg-muted/10 rounded-2xl max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                <Trophy className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">No Tournaments Yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  You haven't created any tournaments yet. Launch your corporate league, tape-ball cup, or club tournament in 5 minutes with our wizard!
                </p>
              </div>
              <Link to="/admin/tournaments/new" className="inline-block">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 rounded-xl shadow-md shadow-emerald-600/20 px-6">
                  <Plus className="h-4 w-4" /> Launch 5-Step Tournament Wizard
                </Button>
              </Link>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
