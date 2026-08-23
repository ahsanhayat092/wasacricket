import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTournamentRules, type TournamentRuleItem, type RuleCategory } from "@/lib/tournament-rules";
import { downloadRulesPDF } from "@/lib/pdf-export";
import { getTournament } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BookOpen,
  Download,
  Search,
  Shield,
  Zap,
  Flame,
  Users,
  Trophy,
  HelpCircle,
  Sparkles,
  Layers,
  Scale,
  MapPin,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function TournamentRules() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isExporting, setIsExporting] = useState(false);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["tournament_rules"],
    queryFn: getTournamentRules,
  });

  const { data: tournament } = useQuery({
    queryKey: ["tournament"],
    queryFn: getTournament,
  });

  const tournamentName = tournament?.name || "WASA Premier League 2026";

  // Filtered Rules based on search & category
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchCat = selectedCategory === "ALL" || r.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === "" ||
        r.rule.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [rules, selectedCategory, searchQuery]);

  // Group rules by category
  const groupedRules = useMemo(() => {
    const groups: { [key in RuleCategory]?: TournamentRuleItem[] } = {};
    filteredRules.forEach((r) => {
      if (!groups[r.category]) {
        groups[r.category] = [];
      }
      groups[r.category]!.push(r);
    });
    return groups;
  }, [filteredRules]);

  const categories: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: "All Rules", value: "ALL", icon: Layers },
    { label: "General Rules", value: "General Rules", icon: Scale },
    { label: "Boundaries & Ground", value: "Boundaries & Ground", icon: MapPin },
    { label: "Bowling & Deliveries", value: "Bowling & Deliveries", icon: Zap },
    { label: "Last Man Standing", value: "Last Man Standing", icon: Flame },
    { label: "Fielding & Subs", value: "Fielding & Substitutions", icon: Users },
    { label: "Tie-Breakers", value: "Tie-Breaker Format", icon: Trophy },
  ];

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      await downloadRulesPDF(rules, tournamentName);
      toast.success("Tournament Rules PDF downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Rules PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const getCategoryIcon = (category: RuleCategory) => {
    switch (category) {
      case "General Rules":
        return Scale;
      case "Boundaries & Ground":
        return MapPin;
      case "Bowling & Deliveries":
        return Zap;
      case "Last Man Standing":
        return Flame;
      case "Fielding & Substitutions":
        return Users;
      case "Tie-Breaker Format":
        return Trophy;
      default:
        return BookOpen;
    }
  };

  const getCategoryColor = (category: RuleCategory) => {
    switch (category) {
      case "General Rules":
        return "border-slate-500/30 bg-slate-500/10 text-slate-300";
      case "Boundaries & Ground":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
      case "Bowling & Deliveries":
        return "border-sky-500/30 bg-sky-500/10 text-sky-400";
      case "Last Man Standing":
        return "border-amber-500/30 bg-amber-500/10 text-amber-400";
      case "Fielding & Substitutions":
        return "border-indigo-500/30 bg-indigo-500/10 text-indigo-400";
      case "Tie-Breaker Format":
        return "border-teal-500/30 bg-teal-500/10 text-teal-400";
      default:
        return "border-muted bg-muted/20 text-foreground";
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 border border-emerald-500/30 p-6 sm:p-10 shadow-2xl text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <Shield className="h-3.5 w-3.5" /> Official Tournament Guidelines
            </div>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-lime-200 to-amber-300">
              Tournament Rules & Regulations
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl font-medium">
              Official playing conditions, bowling quotas, boundary guidelines, Last Man Standing rules, and tie-breaker protocols for {tournamentName}.
            </p>
          </div>

          <div className="shrink-0">
            <Button
              onClick={handleDownloadPdf}
              disabled={isExporting || isLoading || rules.length === 0}
              className="w-full sm:w-auto h-12 px-6 gap-2.5 font-black text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl shadow-lg transition-all"
            >
              <Download className={`h-4 w-4 ${isExporting ? "animate-bounce" : ""}`} />
              <span>{isExporting ? "Generating PDF..." : "Download Official Rules (PDF)"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Key Quick Highlight Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Format</p>
            <p className="text-xs sm:text-sm font-black text-foreground">Last Man Standing</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Overs Quota</p>
            <p className="text-xs sm:text-sm font-black text-foreground">4 League / 5 Final</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">No-Ball</p>
            <p className="text-xs sm:text-sm font-black text-foreground">Free Hit Awarded</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Team Size</p>
            <p className="text-xs sm:text-sm font-black text-foreground">6-a-Side In Field</p>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules (e.g. Free hit, Roof, Catch)..."
              className="pl-9 h-10 text-xs rounded-xl"
            />
          </div>

          <span className="text-xs text-muted-foreground font-semibold shrink-0">
            Showing <strong>{filteredRules.length}</strong> of <strong>{rules.length}</strong> official rules
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((c) => {
            const Icon = c.icon;
            const isSelected = selectedCategory === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setSelectedCategory(c.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rules Display Container */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      ) : filteredRules.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground space-y-2">
          <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="font-bold text-sm">No rules matching your search</p>
          <p className="text-xs">Try searching for a different keyword or clear your filter.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {(Object.keys(groupedRules) as RuleCategory[]).map((catName) => {
            const catRules = groupedRules[catName] ?? [];
            if (catRules.length === 0) return null;
            const Icon = getCategoryIcon(catName);
            const badgeClass = getCategoryColor(catName);

            return (
              <Card key={catName} className="border shadow-md bg-card overflow-hidden">
                <CardHeader className="p-4 sm:p-5 border-b bg-muted/25 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`p-2 rounded-xl border ${badgeClass}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <CardTitle className="text-base sm:text-lg font-black tracking-tight">
                      {catName}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono font-bold">
                    {catRules.length} {catRules.length === 1 ? "Rule" : "Rules"}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-3">
                  <div className="divide-y divide-border/40">
                    {catRules.map((item, idx) => (
                      <div
                        key={item.id}
                        className="py-3 first:pt-0 last:pb-0 flex items-start gap-3 text-sm transition-colors hover:bg-muted/10 p-2 rounded-lg"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20 mt-0.5">
                          {item.order || idx + 1}
                        </span>
                        <div className="space-y-1 leading-relaxed">
                          <p className="font-semibold text-foreground">
                            {item.rule}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
