import * as React from "react";
import { useState, useCallback } from "react";
import { UploadCloud, X, Link as LinkIcon, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/utils/cn";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";

export interface ImageUploaderProps {
  value: string; // The URL or Base64 Data URL
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ImageUploader({ value, onChange, disabled }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBase64 = value.startsWith("data:image");

  const processFile = useCallback((file: File) => {
    setError(null);
    if (!["image/jpeg", "image/png", "image/jpg", "image/webp"].includes(file.type)) {
      setError("Only .jpg, .jpeg, .png, and .webp files are supported.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File is too large (max 5MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        onChange(dataUrl);
      }
    };
    reader.onerror = () => {
      setError("Failed to read the file.");
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [disabled, processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleClear = () => {
    onChange("");
    setError(null);
  };

  return (
    <div className="space-y-3">
      <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest flex justify-between items-center">
        <span>Image Input</span>
        <span className="text-[10px] text-[var(--text-faint)] lowercase normal-case font-normal">
          Direct URL or upload
        </span>
      </label>

      {/* URL Input */}
      <Input
        type="url"
        value={isBase64 ? "Uploaded file attached" : value}
        onChange={(e) => {
          if (!isBase64) {
            onChange(e.target.value);
          }
        }}
        placeholder="Paste direct image link (e.g. https://.../photo.jpg)"
        icon={<LinkIcon className="w-4 h-4" />}
        disabled={disabled || isBase64}
        className={cn(isBase64 && "opacity-60 italic")}
      />

      {/* OR Divider if no image present */}
      {!value && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wider">or upload</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Upload Drag & Drop Zone */}
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
              disabled ? "opacity-50 cursor-not-allowed border-[var(--border)]" : "hover:bg-[var(--primary-surface)] hover:border-[var(--primary)]",
              isDragging ? "border-[var(--primary)] bg-[var(--primary-light)]" : "border-[var(--border)] bg-[var(--bg-surface)]"
            )}
          >
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <UploadCloud className={cn("w-6 h-6 mb-2", isDragging ? "text-[var(--primary)]" : "text-[var(--text-faint)]")} />
              <p className="mb-0.5 text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">Click to upload</span> or drag image
              </p>
              <p className="text-[10px] text-[var(--text-faint)]">PNG, JPG, WEBP up to 5MB</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleFileSelect}
              disabled={disabled}
            />
          </label>
        </>
      )}

      {/* Image Preview Box when value exists */}
      {Boolean(value) && (
        <div className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-elevated)] p-2 space-y-2">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-primary)]">
              <ImageIcon className="w-3.5 h-3.5 text-[var(--primary)]" />
              {isBase64 ? "Uploaded Image" : "URL Image Preview"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="h-6 px-2 text-[11px] text-[var(--danger)] hover:text-[#991b1b] hover:bg-[var(--danger-light)]"
            >
              <X className="w-3 h-3 mr-1" /> Remove
            </Button>
          </div>

          <ImagePreview key={value} value={value} />
        </div>
      )}

      {error && (
        <p className="text-xs text-[var(--danger)] mt-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

// Reset preview state by remounting whenever the image input changes.
function ImagePreview({ value }: { value: string }) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative h-40 w-full rounded-lg overflow-hidden bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center">
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 text-xs text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)] mr-2" /> Loading preview...
        </div>
      )}

      {imageError ? (
        <div className="flex flex-col items-center justify-center text-center p-3 text-xs text-[var(--danger)]">
          <AlertCircle className="w-5 h-5 mb-1.5" />
          <span className="font-semibold">Webpage link detected instead of direct image link</span>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 max-w-xs leading-tight">
            Right-click an image on that webpage & choose <strong>&ldquo;Copy Image Address&rdquo;</strong>, or use the file uploader below.
          </span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Image Preview"
          className="w-full h-full object-contain"
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageLoading(false);
            setImageError(true);
          }}
        />
      )}
    </div>
  );
}
