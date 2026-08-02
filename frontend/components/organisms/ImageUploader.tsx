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
      <label className="text-xs font-medium text-[#12543e] uppercase tracking-wider block flex justify-between items-center">
        <span>Image Input</span>
        <span className="text-[10px] text-[#377d64] lowercase normal-case">
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
        <div className="flex-1 h-px bg-[#a9e2cc]" />
        <span className="text-[10px] text-[#377d64]">OR UPLOAD</span>
        <div className="flex-1 h-px bg-[#a9e2cc]" />
      </div>

      {/* Upload Zone */}
      {!value ? (
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center w-full h-28 border border-dashed rounded-lg cursor-pointer transition-colors",
            disabled ? "opacity-50 cursor-not-allowed border-[#a9e2cc]" : "hover:bg-[#d4f2e6]/50 hover:border-[#1b8867]",
            isDragging ? "border-[#1b8867] bg-[#d4f2e6]" : "border-[#a9e2cc] bg-white"
          )}
        >
          <div className="flex flex-col items-center justify-center py-4">
            <UploadCloud className={cn("w-6 h-6 mb-1.5", isDragging ? "text-[#157357]" : "text-[#377d64]")} />
            <p className="mb-0.5 text-xs text-[#12543e]">
              <span className="font-medium text-[#062b20]">Click to upload</span> or drag image
            </p>
            <p className="text-[10px] text-[#377d64]">PNG, JPG up to 5MB</p>
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
        <div className="relative rounded-lg overflow-hidden h-36 border border-[#a9e2cc] group bg-[#d4f2e6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-[#062b20]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 rounded border border-[#a9e2cc] flex items-center gap-1 text-[10px] font-medium text-[#062b20] shadow-sm">
              <ImageIcon className="w-3 h-3 text-[#1b8867]" /> Uploaded File
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-[#8a2b2b] mt-1 flex items-center gap-1">
           <X className="w-3 h-3 text-[#8a2b2b]" /> {error}
        </p>
      )}
    </div>
  );
}
