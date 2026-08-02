import * as React from "react";
import { useState, useCallback, useEffect } from "react";
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
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isBase64 = value.startsWith("data:image");

  // Reset image load state whenever value changes
  useEffect(() => {
    if (value) {
      setImageLoading(true);
      setImageError(false);
    } else {
      setImageLoading(false);
      setImageError(false);
    }
  }, [value]);

  const processFile = (file: File) => {
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
    setImageError(false);
    setImageLoading(false);
  };

  const isWebpageUrl = Boolean(
    value &&
    !isBase64 &&
    !value.match(/\.(jpeg|jpg|png|webp|gif|svg|avif)($|\?)/i)
  );

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-[#12543e] uppercase tracking-wider flex justify-between items-center">
        <span>Image Input</span>
        <span className="text-[10px] text-[#377d64] lowercase normal-case">
          (Direct Image URL or Upload)
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
        icon={<LinkIcon className="w-4 h-4 text-[#377d64]" />}
        disabled={disabled || isBase64}
        className={cn(isBase64 && "opacity-60 italic text-[#377d64]")}
      />

      {/* OR Divider if no image present */}
      {!value && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-[#a9e2cc]" />
            <span className="text-[10px] font-semibold text-[#377d64]">OR UPLOAD</span>
            <div className="flex-1 h-px bg-[#a9e2cc]" />
          </div>

          {/* Upload Drag & Drop Zone */}
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
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <UploadCloud className={cn("w-6 h-6 mb-1.5", isDragging ? "text-[#157357]" : "text-[#377d64]")} />
              <p className="mb-0.5 text-xs text-[#12543e]">
                <span className="font-semibold text-[#062b20]">Click to upload</span> or drag image
              </p>
              <p className="text-[10px] text-[#377d64]">PNG, JPG, WEBP up to 5MB</p>
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
        <div className="relative rounded-lg overflow-hidden border border-[#a9e2cc] bg-[#d4f2e6]/40 p-2 space-y-2">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#062b20]">
              <ImageIcon className="w-3.5 h-3.5 text-[#1b8867]" />
              {isBase64 ? "Uploaded Image" : "URL Image Preview"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="h-6 px-2 text-[11px] text-[#8a2b2b] hover:text-[#701e1e] hover:bg-[#fdeded]"
            >
              <X className="w-3 h-3 mr-1" /> Remove
            </Button>
          </div>

          <div className="relative h-40 w-full rounded-md overflow-hidden bg-white border border-[#a9e2cc] flex items-center justify-center">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 text-xs text-[#12543e]">
                <Loader2 className="w-4 h-4 animate-spin text-[#1b8867] mr-2" /> Loading preview...
              </div>
            )}

            {imageError ? (
              <div className="flex flex-col items-center justify-center text-center p-3 text-xs text-[#8a2b2b]">
                <AlertCircle className="w-5 h-5 mb-1.5 text-[#8a2b2b]" />
                <span className="font-semibold text-[#8a2b2b]">Webpage link detected instead of direct image link</span>
                <span className="text-[11px] text-[#377d64] mt-1 max-w-xs leading-tight">
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
        </div>
      )}

      {error && (
        <p className="text-xs text-[#8a2b2b] mt-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-[#8a2b2b]" /> {error}
        </p>
      )}
    </div>
  );
}
