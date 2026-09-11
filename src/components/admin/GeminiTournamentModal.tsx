import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Shield,
  Send,
  RefreshCw,
  Sliders,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  type TournamentConfiguration,
  createDefaultConfig,
} from "@/lib/tournament-config";
import {
  generateTournamentConfigWithGemini,
  validateConfigWithAI,
  type AIValidationFinding,
} from "@/lib/gemini-tournament-brain";

interface GeminiTournamentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig?: TournamentConfiguration;
  onApplyConfig: (config: TournamentConfiguration) => void;
}

const PRESET_PROMPTS = [
  {
    title: "Asia Cup T10 (2 Groups of 3)",
    prompt: "Create an Asia Cup style T10 tournament with 6 teams in 2 groups (A and B). 10 overs per side, max 2 overs per bowler, top 2 advance to crossover semis, 1 run wide and no-ball with free hit.",
  },
  {
    title: "Tape Ball Box Cricket (6-a-side)",
    prompt: "Create a 6-a-side indoor tape-ball box tournament. 5 overs per side, strictly 1 over per bowler, last man standing enabled, 2 runs for no-ball, no reball for wides.",
  },
  {
    title: "T20 Super League (IPL Style)",
    prompt: "Standard T20 format with 11 players, 20 overs per side, 4 overs per bowler max, single round robin league, top 4 advance to Page Playoff ladder.",
  },
  {
    title: "Rain Delay Quick Reduction",
    prompt: "Rain interruption: Reduce match overs from 10 overs to 6 overs per side, adjust bowler limits proportionally to 1 over max.",
  },
];

export function GeminiTournamentModal({
  open,
  onOpenChange,
  currentConfig,
  onApplyConfig,
}: GeminiTournamentModalProps) {
  const [promptInput, setPromptInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<TournamentConfiguration | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [findings, setFindings] = useState<AIValidationFinding[]>([]);

  const handleGenerate = async (customPrompt?: string) => {
    const textToUse = customPrompt || promptInput;
    if (!textToUse.trim()) {
      toast.error("Please enter a description or select a prompt preset.");
      return;
    }

    setIsProcessing(true);
    try {
      // Allow realistic feeling processing
      const res = await generateTournamentConfigWithGemini(textToUse, currentConfig);
      setGeneratedConfig(res.config);
      setExplanation(res.explanation);
      setHighlights(res.keyHighlights);
      setFindings(res.findings);
      toast.success("Gemini successfully synthesized tournament rules!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate configuration with Gemini.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!generatedConfig) return;
    onApplyConfig(generatedConfig);
    toast.success("Tournament Configuration applied to Brain!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-950 border-emerald-500/30 text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 text-emerald-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                PitchPe Gemini Tournament Co-Pilot
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                The AI brain of PitchPe: Describe your tournament rules in plain English to generate, validate, and parameterize everything dynamically.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Preset Prompt Suggestions */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Fast AI Presets
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {PRESET_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPromptInput(p.prompt);
                  handleGenerate(p.prompt);
                }}
                className="text-left p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 transition-all text-xs group"
              >
                <div className="font-semibold text-emerald-400 group-hover:text-emerald-300">
                  {p.title}
                </div>
                <div className="text-slate-400 text-[11px] line-clamp-1 mt-0.5">{p.prompt}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tell Gemini how your tournament works:
          </label>
          <div className="relative">
            <Textarea
              rows={3}
              placeholder="e.g., We are organizing a 6-team tape ball tournament in 2 groups of 3. 6 overs per side, 1 over max per bowler, 6 players per team with last man standing, top 2 advance to crossover semis..."
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="bg-slate-900 border-slate-800 focus:border-emerald-500 text-sm placeholder:text-slate-500 pr-24"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => handleGenerate()}
              disabled={isProcessing || !promptInput.trim()}
              className="absolute bottom-2 right-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold gap-1.5 h-8 px-3"
            >
              {isProcessing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Synthesize
            </Button>
          </div>
        </div>

        {/* AI Synthesis Result */}
        {generatedConfig && (
          <div className="space-y-4 pt-3 border-t border-slate-800/80">
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4" /> AI Synthesis Complete
              </div>
              <p className="text-xs text-slate-300">{explanation}</p>
              {highlights.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {highlights.map((h, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px] py-0.5"
                    >
                      {h}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Guardrail Findings */}
            {findings.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" /> AI Guardrails & Validation
                </div>
                {findings.map((f, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                      f.type === "ERROR"
                        ? "bg-rose-950/30 border-rose-500/40 text-rose-300"
                        : f.type === "WARNING"
                        ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
                        : "bg-blue-950/30 border-blue-500/40 text-blue-300"
                    }`}
                  >
                    {f.type === "ERROR" ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : f.type === "WARNING" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold">{f.title}</div>
                      <div className="text-[11px] opacity-90 mt-0.5">{f.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Generated Schema Specs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[11px]">Match Format</div>
                <div className="font-bold text-white mt-0.5">
                  {generatedConfig.matchRules.oversPerSide} Overs / Side
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[11px]">Bowler Quota</div>
                <div className="font-bold text-white mt-0.5">
                  Max {generatedConfig.matchRules.maxOversPerBowler} Overs
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[11px]">Squad & Wickets</div>
                <div className="font-bold text-white mt-0.5">
                  {generatedConfig.matchRules.playersPerTeam} Players (
                  {generatedConfig.matchRules.allowLastManStanding ? "LMS On" : "LMS Off"})
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[11px]">Stage Format</div>
                <div className="font-bold text-white mt-0.5">
                  {generatedConfig.stages[0]?.type === "GROUPS"
                    ? `${generatedConfig.stages[0].groups?.length || 2} Groups`
                    : "Single League"}
                </div>
              </div>
            </div>

            {/* Apply Action */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-800 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleApply}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" /> Apply Configuration to Brain
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
