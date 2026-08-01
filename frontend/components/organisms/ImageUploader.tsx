import * as React from "react";
import { useState, useCallback } from "react";
import { UploadCloud, X, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
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

  const processFile = (file: File) => {
    setError(null);
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      setError("Only .jpg, .jpeg, and .png files are supported.");
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
  };

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
    [disabled]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    []
  );

  const handleClear = () => {
    onChange("");
    setError(null);
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-white/40 uppercase tracking-widest block flex justify-between items-center">
        <span>Image Input</span>
        <span className="text-[10px] text-white/30 lowercase normal-case">
          (URL or Upload)
        </span>
      </label>

      {/* URL Input (Fallback) */}
      <Input
        type="url"
        value={value.startsWith("data:image") ? "" : value}
        onChange={(e) => {
          if (!value.startsWith("data:image")) {
             onChange(e.target.value);
          }
        }}
        placeholder="Paste public image URL..."
        icon={<LinkIcon className="w-4 h-4" />}
        disabled={disabled || value.startsWith("data:image")}
        className={cn(value.startsWith("data:image") && "opacity-50")}
      />

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] text-white/30">OR UPLOAD</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Upload Zone */}
      {!value ? (
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
            disabled ? "opacity-50 cursor-not-allowed border-white/10" : "hover:bg-white/5 hover:border-amber-500/50",
            isDragging ? "border-amber-500 bg-amber-500/10" : "border-white/20 bg-white/5"
          )}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className={cn("w-8 h-8 mb-2", isDragging ? "text-amber-400" : "text-white/40")} />
            <p className="mb-1 text-xs text-white/70">
              <span className="font-semibold text-amber-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-[10px] text-white/40">PNG, JPG up to 5MB</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleFileSelect}
            disabled={disabled}
          />
        </label>
      ) : (
        /* Preview Zone */
        <div className="relative rounded-xl overflow-hidden h-40 border border-amber-500/30 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClear}
              className="gap-2"
              disabled={disabled}
            >
              <X className="w-4 h-4" /> Remove Image
            </Button>
          </div>
          {value.startsWith("data:image") && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded-md backdrop-blur flex items-center gap-1 text-[10px] font-medium text-amber-300 border border-white/10">
              <ImageIcon className="w-3 h-3" /> Uploaded File
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
           <X className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}
