import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tv,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Layers,
  MonitorPlay,
  Settings2,
  Video,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

export interface BroadcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  matchTitle?: string;
}

export function BroadcastModal({
  open,
  onOpenChange,
  matchId,
  matchTitle = "Live Cricket Match",
}: BroadcastModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<"tv_classic" | "ticker" | "scorebox">("tv_classic");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://wasacricket.vercel.app";
  const overlayUrl = `${baseUrl}/broadcast/${matchId}?theme=${selectedTheme}`;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      toast.success("📺 OBS Browser Source URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.info(`OBS URL: ${overlayUrl}`);
    }
  };

  const handleOpenPreview = () => {
    window.open(overlayUrl, "_blank");
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full bg-card border border-border shadow-2xl p-6 z-[100]">
        <DialogHeader className="space-y-2 pb-2 text-left">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20">
              <Tv className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                Live Broadcast Overlay (OBS Studio)
                <Badge className="bg-red-500 text-white font-bold text-[10px] uppercase tracking-wider">
                  STREAM READY
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Stream real-time TV-style cricket scoreboard graphics directly into OBS Studio, vMix, or Streamlabs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Theme Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-emerald-500" /> Choose Overlay Style
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={() => setSelectedTheme("tv_classic")}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedTheme === "tv_classic"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-md"
                    : "border-border/60 hover:border-border hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black">📺 TV Lower-Third</span>
                  {selectedTheme === "tv_classic" && <Check className="h-4 w-4 text-emerald-500" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Full broadcast bar with Batsmen, Bowlers, Over balls, and Target.
                </p>
              </div>

              <div
                onClick={() => setSelectedTheme("ticker")}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedTheme === "ticker"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-md"
                    : "border-border/60 hover:border-border hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black">⚡ Bottom Ticker</span>
                  {selectedTheme === "ticker" && <Check className="h-4 w-4 text-emerald-500" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ultra-slim 60px ticker bar for vertical or mobile livestreaming.
                </p>
              </div>

              <div
                onClick={() => setSelectedTheme("scorebox")}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedTheme === "scorebox"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-md"
                    : "border-border/60 hover:border-border hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black">🗂️ Top Scorebox</span>
                  {selectedTheme === "scorebox" && <Check className="h-4 w-4 text-emerald-500" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Compact top-left scoreboard ideal for single camera angles.
                </p>
              </div>
            </div>
          </div>

          {/* Browser Source URL Bar */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Video className="h-4 w-4 text-red-500" /> OBS Browser Source URL
              </span>
              <span className="text-[11px] text-emerald-500 font-bold">Transparent Canvas (Auto-Syncing)</span>
            </label>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <Input
                readOnly
                value={overlayUrl}
                className="font-mono text-xs h-11 bg-muted/50 border-border select-all font-semibold flex-1 min-w-[200px]"
              />
              <Button
                onClick={handleCopy}
                className={`h-11 px-5 font-bold gap-2 text-xs rounded-xl shadow-md shrink-0 transition-all ${
                  copied ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-red-600 hover:bg-red-500 text-white shadow-red-500/20"
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy URL"}
              </Button>
              <Button
                onClick={handleOpenPreview}
                variant="outline"
                className="h-11 px-4 text-xs font-bold rounded-xl gap-1.5 shrink-0"
                title="Open Fullscreen Preview in New Tab"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open Preview</span>
              </Button>
            </div>
          </div>

          {/* 3-Step Setup Instructions for OBS Studio */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Settings2 className="h-4 w-4 text-amber-500" /> How to Setup in OBS Studio / Streamlabs:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-card border space-y-1">
                <span className="font-bold text-emerald-500">Step 1</span>
                <p className="text-muted-foreground text-[11px]">
                  In OBS, click <strong>+ Add Source</strong> and select <strong>Browser</strong>.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-card border space-y-1">
                <span className="font-bold text-emerald-500">Step 2</span>
                <p className="text-muted-foreground text-[11px]">
                  Paste the copied URL above into the <strong>URL</strong> field.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-card border space-y-1">
                <span className="font-bold text-emerald-500">Step 3</span>
                <p className="text-muted-foreground text-[11px]">
                  Set Width: <strong className="text-foreground">1920</strong>, Height: <strong className="text-foreground">1080</strong>, FPS: <strong className="text-foreground">60</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
