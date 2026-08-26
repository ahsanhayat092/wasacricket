import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTournamentRules,
  saveTournamentRules,
  resetTournamentRules,
  type TournamentRuleItem,
  type RuleCategory,
} from "@/lib/tournament-rules";
import { downloadRulesPDF } from "@/lib/pdf-export";
import { getTournament } from "@/lib/queries";
import { useTournament } from "@/context/TournamentContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Download,
  ShieldAlert,
  CheckCircle2,
  Layers,
  Scale,
  MapPin,
  Zap,
  Flame,
  Users,
  Trophy,
} from "lucide-react";

const CATEGORIES: RuleCategory[] = [
  "General Rules",
  "Boundaries & Ground",
  "Bowling & Deliveries",
  "Last Man Standing",
  "Fielding & Substitutions",
  "Tie-Breaker Format",
];

export default function AdminRules() {
  const queryClient = useQueryClient();
  const { tournamentId, tournament } = useTournament();
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<RuleCategory>("General Rules");
  const [formRuleText, setFormRuleText] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["tournament_rules", tournamentId],
    queryFn: () => getTournamentRules(tournamentId),
  });

  const tournamentName = tournament?.name || "WASA Premier League 2026";

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (updated: TournamentRuleItem[]) => saveTournamentRules(updated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament_rules", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournament_rules"] });
      toast.success("Tournament rules saved successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save rules.");
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => resetTournamentRules(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament_rules"] });
      toast.success("Tournament rules reset to official defaults!");
      setResetDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reset rules.");
    },
  });

  const openAddModal = () => {
    setEditingId(null);
    setFormCategory("General Rules");
    setFormRuleText("");
    setEditModalOpen(true);
  };

  const openEditModal = (rule: TournamentRuleItem) => {
    setEditingId(rule.id);
    setFormCategory(rule.category);
    setFormRuleText(rule.rule);
    setEditModalOpen(true);
  };

  const handleSaveForm = async () => {
    if (!formRuleText.trim()) {
      toast.error("Please enter the rule text.");
      return;
    }

    let updated: TournamentRuleItem[];
    if (editingId) {
      // Edit existing
      updated = rules.map((r) =>
        r.id === editingId
          ? { ...r, category: formCategory, rule: formRuleText.trim(), updatedAt: Date.now() }
          : r
      );
    } else {
      // Add new
      const newRule: TournamentRuleItem = {
        id: `rule-${Date.now()}`,
        category: formCategory,
        rule: formRuleText.trim(),
        order: rules.length + 1,
        createdAt: Date.now(),
      };
      updated = [...rules, newRule];
    }

    setEditModalOpen(false);
    await saveMutation.mutateAsync(updated);
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleId) return;
    const updated = rules.filter((r) => r.id !== deleteRuleId);
    setDeleteRuleId(null);
    await saveMutation.mutateAsync(updated);
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;

    const copy = [...rules];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    await saveMutation.mutateAsync(copy);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      await downloadRulesPDF(rules, tournamentName);
      toast.success("Tournament Rules PDF generated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const filteredRules = useMemo(() => {
    if (selectedCategoryFilter === "ALL") return rules;
    return rules.filter((r) => r.category === selectedCategoryFilter);
  }, [rules, selectedCategoryFilter]);

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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-500" /> Tournament Rules Management
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Add, update, reorder, or remove official tournament playing conditions and ground guidelines.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isExporting || rules.length === 0}
            className="text-xs font-bold gap-1.5 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Rules PDF</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetDialogOpen(true)}
            className="text-xs font-bold gap-1.5 border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset to Defaults</span>
          </Button>

          <Button
            size="sm"
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Rule</span>
          </Button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedCategoryFilter("ALL")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedCategoryFilter === "ALL"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
          }`}
        >
          All Categories ({rules.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = rules.filter((r) => r.category === cat).length;
          const isSelected = selectedCategoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isSelected
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Rules List Table */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : rules.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-bold text-sm">No rules configured yet.</p>
          <Button onClick={openAddModal} className="mt-4 text-xs font-bold">
            Add First Rule
          </Button>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredRules.map((rule, idx) => {
            const actualIndex = rules.findIndex((r) => r.id === rule.id);
            const Icon = getCategoryIcon(rule.category);

            return (
              <Card
                key={rule.id}
                className="border bg-card shadow-sm hover:border-emerald-500/40 transition-all"
              >
                <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-black border border-emerald-500/30 mt-0.5">
                      {actualIndex + 1}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold border-border/60 gap-1 px-2 py-0">
                          <Icon className="h-3 w-3 text-emerald-500" />
                          {rule.category}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {rule.rule}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={actualIndex === 0}
                      onClick={() => handleMove(actualIndex, "up")}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={actualIndex === rules.length - 1}
                      onClick={() => handleMove(actualIndex, "down")}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditModal(rule)}
                      className="h-8 w-8 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteRuleId(rule.id)}
                      className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Rule Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-500" />
              {editingId ? "Edit Tournament Rule" : "Add Tournament Rule"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure rule description and assign to appropriate category.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Rule Category</Label>
              <Select
                value={formCategory}
                onValueChange={(val: RuleCategory) => setFormCategory(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Rule Description</Label>
              <Textarea
                rows={4}
                value={formRuleText}
                onChange={(e) => setFormRuleText(e.target.value)}
                placeholder="e.g. Free hit awarded after every No-Ball..."
                className="text-xs leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveForm}
              disabled={saveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold text-xs"
            >
              {saveMutation.isPending ? "Saving..." : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Confirmation Alert */}
      <AlertDialog open={!!deleteRuleId} onOpenChange={(open) => !open && setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Remove Rule?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove this rule from the tournament guidelines? This change will reflect live to the public.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRule}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-500 flex items-center gap-2">
              <RotateCcw className="h-5 w-5" /> Reset to Official Tournament Rules?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will restore all 25 official default tournament rules (Last Man Standing, Free Hits, Over Limits, Boundary specs, and Tie-Breakers) and overwrite any custom edits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetMutation.mutate()}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold"
            >
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
