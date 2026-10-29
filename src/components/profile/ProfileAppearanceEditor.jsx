"use client";

import { Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_PROFILE_APPEARANCE, PROFILE_ART_STYLES, getProfileAppearanceProps } from "@/lib/profile-appearance";

export default function ProfileAppearanceEditor({ value, onChange }) {
  const appearance = value || DEFAULT_PROFILE_APPEARANCE;
  const update = (field, nextValue) => onChange({ ...appearance, [field]: nextValue });

  return (
    <details className="group rounded-xl border border-white/10 bg-card/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-semibold"><Palette className="h-5 w-5 text-primary" aria-hidden="true" /> Profile appearance</span>
        <span className="text-sm text-muted-foreground group-open:hidden">Customize +</span>
        <span className="hidden text-sm text-muted-foreground group-open:inline">Close −</span>
      </summary>
      <div className="space-y-5 border-t border-white/10 p-5">
        <p className="text-sm text-muted-foreground">Give your profile its own look. Your choices appear on your public profile and are saved with your other changes.</p>
        <div className="mission-hub-shell relative isolate overflow-hidden rounded-xl border border-white/10 p-5" {...getProfileAppearanceProps(value)}>
          <div className="relative rounded-lg border border-primary/30 bg-black/70 p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-primary">Appearance preview</p>
            <p className="mt-2 text-lg font-semibold text-white">Your creator profile</p>
            <p className="mt-1 text-sm text-gray-300">{value ? "Your background and accent, together." : "The original GO profile appearance."}</p>
          </div>
        </div>
        <fieldset>
          <legend className="mb-3 text-sm font-medium">Art style</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PROFILE_ART_STYLES.map((style) => (
              <label key={style.value} className={`cursor-pointer rounded-lg border p-3 text-left focus-within:ring-2 focus-within:ring-primary ${appearance.style === style.value ? "border-primary bg-primary/10" : "border-white/10 bg-black/20"}`}>
                <input className="sr-only" type="radio" name="profile-art-style" value={style.value} checked={appearance.style === style.value} onChange={() => update("style", style.value)} />
                <span className="block text-sm font-medium">{style.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{style.description}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-6">
          {[{ field: "backgroundColor", label: "Background color" }, { field: "accentColor", label: "Accent color" }].map(({ field, label }) => (
            <label key={field} className="flex items-center gap-3 text-sm font-medium">
              <input type="color" value={appearance[field]} onChange={(event) => update(field, event.target.value)} className="h-10 w-12 cursor-pointer rounded border border-white/20 bg-transparent p-1" />
              <span>{label}<span className="block font-mono text-xs font-normal text-muted-foreground">{appearance[field]}</span></span>
            </label>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}><RotateCcw className="mr-2 h-4 w-4" /> Restore default appearance</Button>
      </div>
    </details>
  );
}
