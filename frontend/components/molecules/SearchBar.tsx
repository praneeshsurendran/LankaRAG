import * as React from "react";
import { Input, Textarea } from "@/components/atoms/Input";
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
      <label className="text-xs font-medium text-white/40 uppercase tracking-widest block">
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
        <div className="absolute right-2 bottom-2">
          <Button
            size="sm"
            onClick={onSubmit}
            isLoading={isLoading}
            disabled={!query.trim() || disabled}
            variant="primary"
            className="w-8 h-8 p-0 rounded-lg"
          >
            {isHybrid ? <Send className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
