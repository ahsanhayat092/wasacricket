import React, { useRef, useState } from "react";
import { uploadImage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UploadCloud, Loader2, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: "players" | "teams" | "tournaments" | "uploads";
  label?: string;
  placeholderText?: string;
  avatarSize?: "sm" | "md" | "lg";
  className?: string;
}

export function ImageUploader({
  value,
  onChange,
  folder = "uploads",
  label = "Photo / Logo",
  placeholderText = "Upload from device or paste link",
  avatarSize = "md",
  className = "",
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await uploadImage(file, folder);
      onChange(url);
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Failed to upload image. Make sure Storage is enabled.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const avatarDimensions =
    avatarSize === "sm"
      ? "h-10 w-10"
      : avatarSize === "lg"
      ? "h-20 w-20"
      : "h-14 w-14";

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-xs font-bold text-foreground block">{label}</label>}

      <div className="flex items-center gap-3">
        {/* Preview Thumbnail */}
        <Avatar className={`${avatarDimensions} border border-border shrink-0 bg-muted/30`}>
          <AvatarImage src={value || undefined} className="object-cover" />
          <AvatarFallback className="text-muted-foreground text-xs font-bold bg-muted/60">
            <ImageIcon className="h-5 w-5 opacity-60" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
            />

            {/* Click to upload button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-8 text-xs font-bold rounded-lg gap-1.5 border-dashed hover:border-emerald-500 hover:text-emerald-600 transition-colors"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="h-3.5 w-3.5 text-emerald-500" />
                  {value ? "Change Photo" : "Upload Picture"}
                </>
              )}
            </Button>

            {/* Clear button if image exists */}
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange("")}
                className="h-8 w-8 text-muted-foreground hover:text-rose-500"
                title="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Optional manual URL input fallback */}
          <Input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholderText}
            className="h-7 text-[11px] font-mono text-muted-foreground bg-muted/20 rounded-md"
          />
        </div>
      </div>
    </div>
  );
}
