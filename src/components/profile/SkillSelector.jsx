"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { LANDING_FALLBACK_SKILLS } from "@/constants/skills";
import {
  MAX_PROFILE_SKILLS,
  MAX_SKILL_NAME_LENGTH,
  getSkillKey,
  normalizeSkillName,
} from "@/lib/skills";

const MAX_AUTOCOMPLETE_RESULTS = 8;
const EMPTY_SKILLS = [];

export function SkillSelector({
  value = [],
  onChange,
  submissionLabel = "save your profile",
  suggestions = LANDING_FALLBACK_SKILLS,
  loadCatalog = true,
  catalogMode = "popular",
  allowCustom = true,
  suggestionsLabel = "Popular community skills",
  suggestionsHelp = "Choose from the skills used most often across community profiles.",
  customLabel = "Search and add a skill",
  customPlaceholder = "Start typing a skill",
  addLabel = "Add skill",
  emptyText = "Add skills to help collaborators discover your expertise.",
  maxItems = MAX_PROFILE_SKILLS,
}) {
  const [catalogSkills, setCatalogSkills] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const inputId = useId();
  const listId = useId();
  const selectedSkills = useMemo(
    () => (Array.isArray(value) ? value : EMPTY_SKILLS),
    [value]
  );

  const availableSkills = useMemo(() => {
    const uniqueSkills = new Map();

    [...suggestions, ...catalogSkills].forEach((skill) => {
      const name = normalizeSkillName(skill);
      if (!name) return;
      const key = getSkillKey(name);
      if (!uniqueSkills.has(key)) uniqueSkills.set(key, name);
    });

    return [...uniqueSkills.values()];
  }, [catalogSkills, suggestions]);

  const matchingSkills = useMemo(() => {
    const query = getSkillKey(inputValue);
    if (!query) return [];

    return availableSkills
      .filter(
        (skill) =>
          !selectedSkills.some(
            (selectedSkill) => getSkillKey(selectedSkill) === getSkillKey(skill)
          ) && getSkillKey(skill).includes(query)
      )
      .sort((a, b) => {
        const aStartsWith = getSkillKey(a).startsWith(query);
        const bStartsWith = getSkillKey(b).startsWith(query);
        if (aStartsWith !== bStartsWith) return aStartsWith ? -1 : 1;
        return a.localeCompare(b);
      })
      .slice(0, MAX_AUTOCOMPLETE_RESULTS);
  }, [availableSkills, inputValue, selectedSkills]);

  useEffect(() => {
    if (!loadCatalog) {
      setCatalogSkills([]);
      return undefined;
    }

    const controller = new AbortController();
    const endpoint =
      catalogMode === "all"
        ? "/api/skills"
        : "/api/skills?popular=true&limit=20";

    const loadSkills = async () => {
      try {
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) return;

        const data = await response.json();
        if (Array.isArray(data.skills)) {
          setCatalogSkills(
            data.skills.map((skill) => skill?.name).filter(Boolean)
          );
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error loading skills:", error);
        }
      }
    };

    loadSkills();
    return () => controller.abort();
  }, [catalogMode, loadCatalog]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const addSkill = (skill) => {
    const normalizedSkill = normalizeSkillName(skill);
    if (!normalizedSkill) return;

    if (normalizedSkill.length > MAX_SKILL_NAME_LENGTH) {
      toast({
        title: "Skill name is too long",
        description: `Use ${MAX_SKILL_NAME_LENGTH} characters or fewer.`,
        variant: "destructive",
      });
      return;
    }

    if (selectedSkills.length >= maxItems) {
      toast({
        title: "Skill limit reached",
        description: `You can include up to ${maxItems} tags here.`,
        variant: "destructive",
      });
      return;
    }

    if (
      selectedSkills.some(
        (selectedSkill) =>
          getSkillKey(selectedSkill) === getSkillKey(normalizedSkill)
      )
    ) {
      setInputValue("");
      setIsOpen(false);
      return;
    }

    const directoryMatch = availableSkills.find(
      (availableSkill) =>
        getSkillKey(availableSkill) === getSkillKey(normalizedSkill)
    );
    onChange([...selectedSkills, directoryMatch || normalizedSkill]);
    setInputValue("");
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const removeSkill = (skill) => {
    const skillKey = getSkillKey(skill);
    onChange(
      selectedSkills.filter(
        (selectedSkill) => getSkillKey(selectedSkill) !== skillKey
      )
    );
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      if (matchingSkills.length === 0) return;
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) =>
        Math.min(index + 1, matchingSkills.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      if (matchingSkills.length === 0) return;
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const suggestedSkill = matchingSkills[activeIndex];
      const exactSkill = availableSkills.find(
        (skill) => getSkillKey(skill) === getSkillKey(inputValue)
      );

      if (suggestedSkill || exactSkill) {
        addSkill(suggestedSkill || exactSkill);
      } else if (allowCustom) {
        addSkill(inputValue);
      }
    }
  };

  return (
    <div ref={rootRef} className="space-y-4">
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">{suggestionsLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {suggestionsHelp}
          </p>
        </div>

        <div className="relative">
          <Label htmlFor={inputId}>{customLabel}</Label>
          <Input
            id={inputId}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={isOpen && matchingSkills.length ? listId : undefined}
            aria-expanded={isOpen && matchingSkills.length > 0}
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
            }
            value={inputValue}
            onChange={(event) => {
              setInputValue(event.target.value);
              setIsOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => {
              if (inputValue.trim()) setIsOpen(true);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={
              catalogMode === "all"
                ? "Start typing to search the skill directory"
                : customPlaceholder
            }
            maxLength={MAX_SKILL_NAME_LENGTH}
            autoComplete="off"
          />

          {isOpen && matchingSkills.length > 0 ? (
            <div
              id={listId}
              role="listbox"
              aria-label={`${suggestionsLabel} autocomplete suggestions`}
              className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg"
            >
              {matchingSkills.map((skill, index) => (
                <button
                  key={getSkillKey(skill)}
                  id={`${listId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  className={`flex w-full items-center rounded-sm px-3 py-2 text-left text-sm transition-colors ${
                    activeIndex === index
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-accent/60"
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => addSkill(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {allowCustom
              ? `Select an existing match or press Enter to add a new skill. New tags join the master directory for admin review when you ${submissionLabel}.`
              : "Select a matching skill from the directory."}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => addSkill(inputValue)}
            disabled={!allowCustom || !normalizeSkillName(inputValue)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {addLabel}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Your selected skills</span>
        <span>
          {selectedSkills.length}/{maxItems}
        </span>
      </div>

      <div className="flex min-h-9 flex-wrap gap-2">
        {selectedSkills.map((skill) => (
          <Badge
            key={getSkillKey(skill)}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Remove ${skill}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {selectedSkills.length === 0 && (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

export function SkillTagInput({
  value = "",
  onChange,
  label = "Primary role",
  placeholder = "Enter your primary role",
  required = false,
}) {
  const inputId = useId();

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => onChange(normalizeSkillName(event.target.value))}
        placeholder={placeholder}
        maxLength={MAX_SKILL_NAME_LENGTH}
        autoComplete="off"
        required={required}
      />
      <p className="text-xs text-muted-foreground">
        Enter the role that best describes your primary contribution.
      </p>
    </div>
  );
}
