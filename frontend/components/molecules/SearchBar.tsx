import * as React from "react";
import { Textarea } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Send, Search } from "lucide-react";

export interface SearchBarProps {
  query: string;
  onChange: (query: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
  isHybrid?: boolean;
  disabled?: boolean;
}

export function SearchBar({
  query,
  onChange,
  onSubmit,
  isLoading,
  placeholder,
  isHybrid,
  disabled,
}: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block">
        {isHybrid ? "Your Question" : "Search Query"}
      </label>
      <div className="relative">
        <Textarea
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pr-12"
          disabled={disabled}
        />
        <div className="absolute right-2.5 bottom-2.5">
          <Button
            size="sm"
            onClick={onSubmit}
            isLoading={isLoading}
            disabled={!query.trim() || disabled}
            variant="primary"
            className="w-7 h-7 p-0 rounded-lg"
          >
            {isHybrid ? <Send className="w-3.5 h-3.5 text-white" /> : <Search className="w-3.5 h-3.5 text-white" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
