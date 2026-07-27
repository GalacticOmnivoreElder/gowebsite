"use client";

import { useEffect, useId, useState } from "react";
import { Check, Plus, X } from "lucide-react";

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

export function SkillSelector({
  value = [],
  onChange,
  submissionLabel = "save your profile",
}) {
  const [popularSkills, setPopularSkills] = useState(LANDING_FALLBACK_SKILLS);
  const [customSkill, setCustomSkill] = useState("");
  const customSkillId = useId();
  const selectedSkills = Array.isArray(value) ? value : [];

  useEffect(() => {
    const controller = new AbortController();

    const loadPopularSkills = async () => {
      try {
        const response = await fetch("/api/skills?popular=true&limit=20", {
          signal: controller.signal,
        });
        if (!response.ok) return;

        const data = await response.json();
        if (Array.isArray(data.skills) && data.skills.length > 0) {
          setPopularSkills(data.skills.map((skill) => skill.name));
        }
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Error loading popular skills:", error);
      }
    };

    loadPopularSkills();

    return () => controller.abort();
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

    if (selectedSkills.length >= MAX_PROFILE_SKILLS) {
      toast({
        title: "Skill limit reached",
        description: `Profiles can include up to ${MAX_PROFILE_SKILLS} skills.`,
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
      return;
    }

    onChange([...selectedSkills, normalizedSkill]);
    setCustomSkill("");
  };

  const removeSkill = (skill) => {
    const skillKey = getSkillKey(skill);
    onChange(
      selectedSkills.filter(
        (selectedSkill) => getSkillKey(selectedSkill) !== skillKey
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Popular community skills</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose from the skills used most often across community profiles.
          </p>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Popular community skills"
        >
          {popularSkills.map((skill) => {
            const selected = selectedSkills.some(
              (selectedSkill) =>
                getSkillKey(selectedSkill) === getSkillKey(skill)
            );
            const limitReached =
              selectedSkills.length >= MAX_PROFILE_SKILLS && !selected;

            return (
              <button
                key={skill}
                type="button"
                aria-pressed={selected}
                aria-label={`${selected ? "Remove" : "Add"} ${skill}`}
                disabled={limitReached}
                onClick={() =>
                  selected ? removeSkill(skill) : addSkill(skill)
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-foreground"
                }`}
              >
                {selected && <Check className="h-3.5 w-3.5" />}
                {skill}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={customSkillId}>Can&apos;t find your skill?</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={customSkillId}
            value={customSkill}
            onChange={(event) => setCustomSkill(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addSkill(customSkill);
              }
            }}
            placeholder="Create a skill tag"
            maxLength={MAX_SKILL_NAME_LENGTH}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addSkill(customSkill)}
            disabled={!normalizeSkillName(customSkill)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add skill
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          New tags join the master directory for admin review when you{" "}
          {submissionLabel}.
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Your selected skills</span>
        <span>
          {selectedSkills.length}/{MAX_PROFILE_SKILLS}
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
          <p className="text-sm text-muted-foreground">
            Add skills to help collaborators discover your expertise.
          </p>
        )}
      </div>
    </div>
  );
}
