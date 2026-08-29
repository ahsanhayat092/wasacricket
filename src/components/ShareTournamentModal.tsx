import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  Copy,
  Check,
  Download,
  QrCode,
  Sparkles,
  Trophy,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Tournament } from "@/lib/firestore";

interface ShareTournamentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament?: Tournament | null;
}

export function ShareTournamentModal({
  open,
  onOpenChange,
  tournament,
}: ShareTournamentModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const tournamentName = tournament?.name || "WASA Premier League 2026";
  const slug = tournament?.slug || tournament?.id || "wasa-2026";
  const shareUrl = `${window.location.origin}/t/${slug}`;

  // Generate QR Code data URL
  useEffect(() => {
    if (open && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#064e3b", // Deep emerald
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("Error generating QR code:", err));
    }
  }, [open, shareUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Tournament link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🏏 *${tournamentName}*\n\nFollow live ball-by-ball scores, match schedules, points tables, and player statistics live on the web!\n\n👉 *View Tournament Live:* ${shareUrl}`
    );
    const whatsappUrl = `https://api.whatsapp.com/send?text=${text}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleDownloadPoster = () => {
    if (!qrDataUrl) return;

    // Create a high-res printable banner canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 750;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 750);
    grad.addColorStop(0, "#064e3b");
    grad.addColorStop(1, "#022c22");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 750);

    // Border
    ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, 568, 718);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🏏 SCAN TO FOLLOW LIVE", 300, 80);

    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "#fbbf24"; // amber
    ctx.fillText(tournamentName.slice(0, 32), 300, 125);

    // Venue / Note
    ctx.fillStyle = "#a7f3d0";
    ctx.font = "16px sans-serif";
    ctx.fillText(tournament?.venueName || "Live Cricket Tournament", 300, 160);

    // QR Image
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    qrImg.onload = () => {
      // Draw white card behind QR
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(140, 200, 320, 320, 24);
      ctx.fill();

      ctx.drawImage(qrImg, 150, 210, 300, 300);

      // Footer call to action
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("Live Scores • Standings • Statistics", 300, 570);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px monospace";
      ctx.fillText(shareUrl.replace(/^https?:\/\//, ""), 300, 610);

      ctx.fillStyle = "#10b981";
      ctx.font = "italic 14px sans-serif";
      ctx.fillText("Powered by PitchPe", 300, 680);

      // Download
      const link = document.createElement("a");
      link.download = `${slug}-matchday-qr-poster.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Matchday QR Poster downloaded!");
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-6 bg-card border-emerald-500/30">
        <DialogHeader className="space-y-2 text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner">
            <Share2 className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-black tracking-tight">
            Share Tournament Live
          </DialogTitle>
          <DialogDescription className="text-xs">
            Distribute this link on WhatsApp or print the QR poster for the ground.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* WhatsApp Direct Share Button */}
          <Button
            onClick={handleWhatsAppShare}
            className="w-full h-12 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-sm gap-2.5 rounded-2xl shadow-lg shadow-[#25D366]/20 transition-all hover:scale-[1.01]"
          >
            <MessageCircle className="h-5 w-5 fill-white" /> Share on WhatsApp (Teams & Groups)
          </Button>

          {/* QR Code Card */}
          <div className="p-5 rounded-2xl border bg-muted/20 text-center space-y-4">
            <div className="flex items-center justify-center">
              {qrDataUrl ? (
                <div className="p-3 bg-white rounded-2xl shadow-md inline-block border">
                  <img
                    src={qrDataUrl}
                    alt="Tournament QR Code"
                    className="w-48 h-48 rounded-lg object-contain"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 bg-muted rounded-2xl flex items-center justify-center text-xs text-muted-foreground">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-foreground block">
                Ground & Clubhouse QR Code
              </span>
              <p className="text-[11px] text-muted-foreground">
                Spectators can scan this QR with any smartphone camera to open live scores instantly.
              </p>
            </div>

            <Button
              onClick={handleDownloadPoster}
              variant="outline"
              size="sm"
              className="text-xs font-bold gap-2 rounded-xl border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 h-9"
            >
              <Download className="h-4 w-4" /> Download Matchday QR Poster (PNG)
            </Button>
          </div>

          {/* Copy Link Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">Public Web URL</label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="h-10 text-xs font-mono bg-muted/40 rounded-xl flex-1"
              />
              <Button
                onClick={handleCopy}
                size="sm"
                className={`h-10 px-4 text-xs font-bold rounded-xl gap-1.5 transition-all ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Viral Acquisition Footer Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-500 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Host Your Own Tournament
              </span>
              <p className="text-[11px] text-muted-foreground">
                Want live scoring for your corporate or club league?
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                window.location.href = "/organizer/signup";
              }}
              className="text-[11px] font-bold h-8 rounded-xl shrink-0 border-emerald-500 text-emerald-500"
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
