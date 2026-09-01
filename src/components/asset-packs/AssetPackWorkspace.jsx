"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Info, Trash2 } from "lucide-react";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const empty = {
  packId: "",
  title: "",
  description: "",
  contributorProfile: "",
  previewImage: "",
  downloadUrl: "",
  fileManifest: "",
  compatibility: "",
  version: "1.0.0",
  license: "CC0",
  otherLicense: "",
  attributionRequirements: "",
  commercialUseAllowed: true,
  dependencies: "",
  rightsDeclared: false,
  manifestDeclaredComplete: false,
  safeFilesDeclared: false,
};

const lines = (value) => String(value || "").split("\n").map((item) => item.trim()).filter(Boolean);
const toLines = (value) => Array.isArray(value) ? value.join("\n") : "";
const hasText = (value) => Boolean(String(value || "").trim());
const isHttpsUrl = (value) => {
  try {
    return new URL(String(value || "").trim()).protocol === "https:";
  } catch {
    return false;
  }
};
const isDriveUrl = (value) => {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" && url.hostname === "drive.google.com";
  } catch {
    return false;
  }
};

function getSubmissionChecklist(form) {
  return [
    { key: "title", label: "Pack name", help: "The name people will see in the asset-pack directory.", complete: hasText(form.title) },
    { key: "description", label: "Description", help: "Explain what is included, what it is for, and anything users should know before downloading.", complete: hasText(form.description) },
    { key: "contributorProfile", label: "Contributor profile", help: "A short credit or bio so users know who created the pack.", complete: hasText(form.contributorProfile) },
    { key: "version", label: "Version", help: "Use a version such as 1.0.0; increase it when you submit a new revision.", complete: hasText(form.version) },
    { key: "previewImage", label: "Preview image", help: "A publicly reachable HTTPS image URL used as the pack thumbnail.", complete: isHttpsUrl(form.previewImage) },
    { key: "downloadUrl", label: "Download link", help: "A Google Drive HTTPS link to the ZIP or folder that GO reviewers can open.", complete: isDriveUrl(form.downloadUrl) },
    { key: "fileManifest", label: "Complete file manifest", help: "List every included file or folder path, one per line.", complete: lines(form.fileManifest).length > 0 },
    { key: "license", label: "License", help: "Choose the permissions users receive; an Other license needs its exact terms below.", complete: Boolean(form.license) && (form.license !== "Other" || hasText(form.otherLicense)) },
    { key: "rightsDeclared", label: "Rights confirmation", help: "Confirm that you created or have permission to redistribute every included file.", complete: form.rightsDeclared === true },
    { key: "manifestDeclaredComplete", label: "Manifest confirmation", help: "Confirm that the file list above matches the download exactly.", complete: form.manifestDeclaredComplete === true },
    { key: "safeFilesDeclared", label: "File review confirmation", help: "Confirm that you reviewed the files and listed any external dependencies.", complete: form.safeFilesDeclared === true },
  ];
}

export function AssetPackWorkspace() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(empty);
  const [editingVersionId, setEditingVersionId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const request = useCallback(async (options = {}) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in to manage asset packs");
    return fetch("/api/asset-packs", {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  }, []);

  const load = useCallback(async () => {
    const response = await request();
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Asset-pack workspace could not be loaded");
    setData(result);
  }, [request]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => load().catch((error) => setMessage(error.message)));
    return unsubscribe;
  }, [load]);

  const payload = (submit) => ({
    ...form,
    fileManifest: lines(form.fileManifest),
    compatibility: lines(form.compatibility),
    dependencies: lines(form.dependencies),
    submit,
  });

  const save = async (submit) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await request({
        method: editingVersionId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload(submit), ...(editingVersionId ? { versionId: editingVersionId } : {}) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Asset pack could not be saved");
      setForm(empty);
      setEditingVersionId("");
      setMessage(submit ? "Asset pack submitted for administrator review." : "Asset-pack draft saved.");
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteDraft = async (version) => {
    const title = version.title || "Untitled draft";
    if (!window.confirm(`Delete “${title}”? This draft cannot be recovered.`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await request({
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: version.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Draft could not be deleted");
      if (editingVersionId === version.id) {
        setEditingVersionId("");
        setForm(empty);
      }
      setMessage("Draft deleted.");
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const editVersion = (version) => {
    setEditingVersionId(version.id);
    setForm({
      ...empty,
      ...version,
      packId: version.packId || "",
      fileManifest: toLines(version.fileManifest),
      compatibility: toLines(version.compatibility),
      dependencies: toLines(version.dependencies),
      downloadUrl: version.downloadUrl || "",
    });
    setMessage("Editing the selected draft or changes-requested version.");
  };

  const newVersion = (pack) => {
    setEditingVersionId("");
    setForm({ ...empty, packId: pack.id, title: pack.title || "" });
    setMessage("Creating a new version. The currently published version remains live until this one is approved and published.");
  };

  if (!data && !message) return <p className="py-12 text-center text-muted-foreground">Loading asset-pack workspace...</p>;
  if (!data) return <Card><CardContent className="p-8 text-center"><p>{message}</p><Badge className="mt-3">Coming Soon</Badge></CardContent></Card>;

  const versionablePacks = data.ownedPacks.filter((pack) => ["published", "legacy"].includes(pack.status) && !pack.pendingVersionId);
  const submissionChecklist = getSubmissionChecklist(form);
  const completedRequirements = submissionChecklist.filter((item) => item.complete).length;
  const submissionReady = completedRequirements === submissionChecklist.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-bold">Community asset packs</h2><p className="text-sm text-muted-foreground">Submit original packs for GO review. Published versions are replaced only after a new review.</p></div>
        <Button asChild variant="outline"><Link href="/asset-packs">Browse published packs</Link></Button>
      </div>
      {message ? <p className="rounded-md border p-3 text-sm" role="status">{message}</p> : null}

      {!data.canSubmit ? (
        <Card className="border-primary/30">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-semibold">Active GO membership required</p><p className="mt-1 text-sm text-muted-foreground">You can continue to review existing submissions, but an active Community membership or higher tier is required to create or edit asset-pack versions.</p></div>
            <Button asChild><Link href="/membership">Review membership</Link></Button>
          </CardContent>
        </Card>
      ) : null}

      {data.canSubmit && versionablePacks.length ? (
        <Card>
          <CardHeader><CardTitle>Submit a new version</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">{versionablePacks.map((pack) => <Button key={pack.id} variant="outline" onClick={() => newVersion(pack)}>New version of {pack.title}</Button>)}</CardContent>
        </Card>
      ) : null}

      {data.canSubmit ? (
        <Card>
          <CardHeader><CardTitle>{editingVersionId ? "Edit asset-pack version" : form.packId ? "New version" : "New asset-pack submission"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-3"><Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-semibold">What you need to submit</p><p className="mt-1 text-sm text-muted-foreground">You can save a partial draft at any time. Complete the checklist below before sending it to GO for review. Items marked “Required to submit” are the only fields that block submission.</p></div></div>
              <div className="mt-4 flex items-center justify-between gap-3 text-sm"><span className="font-medium">Submission readiness</span><span className="text-muted-foreground">{completedRequirements} of {submissionChecklist.length} complete</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(completedRequirements / submissionChecklist.length) * 100}%` }} /></div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">{submissionChecklist.map((item) => <div key={item.key} className="flex items-start gap-2 text-sm">{item.complete ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}<div><p className={item.complete ? "font-medium" : "font-medium text-muted-foreground"}>{item.label}</p><p className="text-xs text-muted-foreground">{item.help}</p></div></div>)}</div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="asset-pack-title" label="Pack name" required help="The name people will see in the asset-pack directory." value={form.title} set={(value) => setForm((current) => ({ ...current, title: value }))} />
              <Field id="asset-pack-version" label="Version" required help="Use a version such as 1.0.0; increase it when you submit a new revision." value={form.version} set={(value) => setForm((current) => ({ ...current, version: value }))} />
              <Field id="asset-pack-preview" label="Preview image URL" required type="url" help="Paste a publicly reachable HTTPS image URL. This becomes the pack thumbnail." value={form.previewImage} set={(value) => setForm((current) => ({ ...current, previewImage: value }))} />
              <Field id="asset-pack-download" label="Google Drive download link" required type="url" help="Paste an HTTPS drive.google.com link to the ZIP or folder. GO keeps the saved download protected." value={form.downloadUrl} set={(value) => setForm((current) => ({ ...current, downloadUrl: value }))} />
            </div>
            <Area id="asset-pack-description" label="Description" required help="Explain what is included, what it is for, and anything users should know before downloading." value={form.description} set={(value) => setForm((current) => ({ ...current, description: value }))} />
            <Area id="asset-pack-contributor" label="Contributor profile" required help="Write a short credit or bio so users know who created the pack. Example: “Environment artist focused on stylized props.”" value={form.contributorProfile} set={(value) => setForm((current) => ({ ...current, contributorProfile: value }))} />
            <div className="grid gap-4 md:grid-cols-2">
              <Area id="asset-pack-manifest" label="Complete file manifest" required help="List every included file or folder path, one per line. Example: models/bench.glb" value={form.fileManifest} set={(value) => setForm((current) => ({ ...current, fileManifest: value }))} />
              <Area id="asset-pack-compatibility" label="Software or engine compatibility" help="List engines, software, and versions it works with, one per line. Leave empty if it is not applicable." value={form.compatibility} set={(value) => setForm((current) => ({ ...current, compatibility: value }))} />
              <Area id="asset-pack-dependencies" label="Dependencies" help="List required external assets, plugins, or packages, one per line. Leave empty if there are none." value={form.dependencies} set={(value) => setForm((current) => ({ ...current, dependencies: value }))} />
              <Area id="asset-pack-attribution" label="Attribution requirements" help="Tell users exactly how to credit you, or write “No attribution required.”" value={form.attributionRequirements} set={(value) => setForm((current) => ({ ...current, attributionRequirements: value }))} />
            </div>
            <div className="space-y-2">
              <label htmlFor="asset-pack-license" className="block space-y-1 text-sm"><span className="font-medium">License <span className="font-normal text-primary">Required to submit</span></span><span className="block text-xs text-muted-foreground">Choose the permissions users receive. GO supports CC0, CC BY, CC BY-SA, and MIT; choose Other only when you can provide the exact terms.</span><select id="asset-pack-license" className="w-full rounded-md border bg-background px-3 py-2" value={form.license} onChange={(event) => setForm((current) => ({ ...current, license: event.target.value }))}>{["CC0", "CC BY", "CC BY-SA", "MIT", "Other"].map((license) => <option key={license}>{license}</option>)}</select></label>
              {form.license === "Other" ? <Field id="asset-pack-other-license" label="Other license details" required help="Provide the exact license name and terms or a link for administrator review." value={form.otherLicense} set={(value) => setForm((current) => ({ ...current, otherLicense: value }))} /> : null}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">License and file confirmations</p>
              <p className="text-xs text-muted-foreground">These checkmarks are declarations to GO. The three rights, manifest, and file-review confirmations are required before submission.</p>
              <CheckRow label="Commercial use is allowed under this license" help="Optional. Leave unchecked if your pack is not intended for commercial projects." checked={form.commercialUseAllowed === true} onChange={(checked) => setForm((current) => ({ ...current, commercialUseAllowed: checked }))} />
              <CheckRow required label="I created or have permission to redistribute every included file" help="Required to submit: you have the necessary rights for the complete download." checked={form.rightsDeclared === true} onChange={(checked) => setForm((current) => ({ ...current, rightsDeclared: checked }))} />
              <CheckRow required label="The file manifest matches the download" help="Required to submit: the list above includes every file or folder in the ZIP or Drive folder." checked={form.manifestDeclaredComplete === true} onChange={(checked) => setForm((current) => ({ ...current, manifestDeclaredComplete: checked }))} />
              <CheckRow required label="I reviewed the files and listed all external dependencies" help="Required to submit: you checked the contents and named any plugins, packages, or assets users must provide separately." checked={form.safeFilesDeclared === true} onChange={(checked) => setForm((current) => ({ ...current, safeFilesDeclared: checked }))} />
            </div>
            <div className="flex gap-2">
              <Button disabled={busy} variant="outline" onClick={() => save(false)}>Save draft</Button>
              <Button disabled={busy || !submissionReady} onClick={() => save(true)}>Submit for review</Button>
              {editingVersionId ? <Button variant="ghost" onClick={() => { setEditingVersionId(""); setForm(empty); }}>Cancel edit</Button> : null}
            </div>
            {!submissionReady ? <p className="text-xs text-muted-foreground">Finish the incomplete checklist items above before submitting. Save draft remains available while you work.</p> : null}
          </CardContent>
        </Card>
      ) : null}

      <section>
        <h3 className="mb-3 text-lg font-semibold">Your submissions</h3>
        {data.ownedVersions.length ? (
          <div className="space-y-3">
            {data.ownedVersions.map((version) => (
              <Card key={version.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div><p className="font-semibold">{version.title || "Untitled draft"} - {version.version || "Draft version"}</p><p className="text-sm text-muted-foreground">{version.reviewMessage || "No administrator message"}</p></div>
                  <div className="flex gap-2">
                    <Badge>{version.status.replaceAll("_", " ")}</Badge>
                    {data.canSubmit && ["draft", "changes_requested"].includes(version.status) ? <Button size="sm" variant="outline" onClick={() => editVersion(version)}>Edit</Button> : null}
                    {data.canSubmit && version.status === "draft" ? <Button size="sm" variant="destructive" onClick={() => deleteDraft(version)} disabled={busy}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete draft</Button> : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : <p className="rounded-md border p-6 text-center text-muted-foreground">No asset-pack drafts or submissions yet.</p>}
      </section>
    </div>
  );
}

function Field({ id, label, value, set, type = "text", help, required = false }) {
  return <label htmlFor={id} className="block space-y-1 text-sm"><span className="font-medium">{label} {required ? <span className="font-normal text-primary">Required to submit</span> : <span className="font-normal text-muted-foreground">Optional</span>}</span>{help ? <span id={`${id}-help`} className="block text-xs text-muted-foreground">{help}</span> : null}<Input id={id} aria-describedby={help ? `${id}-help` : undefined} aria-required={required} type={type} value={value || ""} onChange={(event) => set(event.target.value)} /></label>;
}

function Area({ id, label, value, set, help, required = false }) {
  return <label htmlFor={id} className="block space-y-1 text-sm"><span className="font-medium">{label} {required ? <span className="font-normal text-primary">Required to submit</span> : <span className="font-normal text-muted-foreground">Optional</span>}</span>{help ? <span id={`${id}-help`} className="block text-xs text-muted-foreground">{help}</span> : null}<textarea id={id} aria-describedby={help ? `${id}-help` : undefined} aria-required={required} className="min-h-24 w-full rounded-md border bg-background px-3 py-2" value={value || ""} onChange={(event) => set(event.target.value)} /></label>;
}

function CheckRow({ label, help, checked, onChange, required = false }) {
  return <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${checked ? "border-primary/40 bg-primary/5" : "hover:bg-muted/40"}`}><Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} /><span className="space-y-1"><span className="block text-sm font-medium">{label} {required ? <span className="font-normal text-primary">Required to submit</span> : <span className="font-normal text-muted-foreground">Optional</span>}</span>{help ? <span className="block text-xs text-muted-foreground">{help}</span> : null}</span></label>;
}
