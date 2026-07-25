"use client";

import { useId, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  addTag,
  getTagSuggestions,
  removeTag,
} from "@/lib/tag-values";

export function TagInput({
  value = [],
  onChange,
  suggestions = [],
  placeholder = "Type a value and press Enter",
  ariaLabel = "Add a value",
}) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const visibleSuggestions = useMemo(
    () => getTagSuggestions(suggestions, value, draft),
    [draft, suggestions, value]
  );

  const commit = (candidate = draft) => {
    const next = addTag(value, candidate);
    if (next !== value) onChange(next);
    setDraft("");
  };

  const handleChange = (event) => {
    const text = event.target.value;
    if (!text.includes(",")) {
      setDraft(text);
      return;
    }

    const parts = text.split(",");
    const remainder = parts.pop() || "";
    const next = parts.reduce((tags, part) => addTag(tags, part), value);
    if (next !== value) onChange(next);
    setDraft(remainder);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
      return;
    }

    if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Selected values">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              <span>{tag}</span>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onChange(removeTag(value, tag))}
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Input
          id={inputId}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (draft.trim()) commit();
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete="off"
        />

        {focused && visibleSuggestions.length > 0 && (
          <div
            className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto border bg-popover p-1 text-popover-foreground shadow-md"
            role="listbox"
            aria-label="Suggestions"
          >
            {visibleSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                role="option"
                aria-selected="false"
                className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Choose a suggestion or add your own with Enter or a comma.
      </p>
    </div>
  );
}
