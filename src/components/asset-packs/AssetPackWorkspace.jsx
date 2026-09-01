"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title" value={form.title} set={(value) => setForm((current) => ({ ...current, title: value }))} />
              <Field label="Version" value={form.version} set={(value) => setForm((current) => ({ ...current, version: value }))} />
              <Field label="Preview image HTTPS URL" type="url" value={form.previewImage} set={(value) => setForm((current) => ({ ...current, previewImage: value }))} />
              <Field label="Google Drive download URL" type="url" value={form.downloadUrl} set={(value) => setForm((current) => ({ ...current, downloadUrl: value }))} />
            </div>
            <Area label="Description" value={form.description} set={(value) => setForm((current) => ({ ...current, description: value }))} />
            <Area label="Contributor profile" value={form.contributorProfile} set={(value) => setForm((current) => ({ ...current, contributorProfile: value }))} />
            <div className="grid gap-4 md:grid-cols-2">
              <Area label="Complete file manifest (one file per line)" value={form.fileManifest} set={(value) => setForm((current) => ({ ...current, fileManifest: value }))} />
              <Area label="Software or engine compatibility (one per line)" value={form.compatibility} set={(value) => setForm((current) => ({ ...current, compatibility: value }))} />
              <Area label="Dependencies (one per line)" value={form.dependencies} set={(value) => setForm((current) => ({ ...current, dependencies: value }))} />
              <Area label="Attribution requirements" value={form.attributionRequirements} set={(value) => setForm((current) => ({ ...current, attributionRequirements: value }))} />
            </div>
            <label className="space-y-1 text-sm"><span className="font-medium">License</span><select className="w-full rounded-md border bg-background px-3 py-2" value={form.license} onChange={(event) => setForm((current) => ({ ...current, license: event.target.value }))}>{["CC0", "CC BY", "CC BY-SA", "MIT", "Other"].map((license) => <option key={license}>{license}</option>)}</select></label>
            {form.license === "Other" ? <Field label="Other license for administrator review" value={form.otherLicense} set={(value) => setForm((current) => ({ ...current, otherLicense: value }))} /> : null}
            <div className="space-y-2">
              {[
                ["commercialUseAllowed", "Commercial use is permitted under the selected license"],
                ["rightsDeclared", "I have the rights required to contribute every included file"],
                ["manifestDeclaredComplete", "The file manifest is complete"],
                ["safeFilesDeclared", "I have checked the files and declared all dependencies"],
              ].map(([key, label]) => <label key={key} className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={form[key] === true} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}
            </div>
            <div className="flex gap-2">
              <Button disabled={busy} variant="outline" onClick={() => save(false)}>Save draft</Button>
              <Button disabled={busy} onClick={() => save(true)}>Submit for review</Button>
              {editingVersionId ? <Button variant="ghost" onClick={() => { setEditingVersionId(""); setForm(empty); }}>Cancel edit</Button> : null}
            </div>
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
                  <div><p className="font-semibold">{version.title} - {version.version}</p><p className="text-sm text-muted-foreground">{version.reviewMessage || "No administrator message"}</p></div>
                  <div className="flex gap-2">
                    <Badge>{version.status.replaceAll("_", " ")}</Badge>
                    {data.canSubmit && ["draft", "changes_requested"].includes(version.status) ? <Button size="sm" variant="outline" onClick={() => editVersion(version)}>Edit</Button> : null}
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

function Field({ label, value, set, type = "text" }) {
  return <label className="space-y-1 text-sm"><span className="font-medium">{label}</span><Input type={type} value={value || ""} onChange={(event) => set(event.target.value)} /></label>;
}

function Area({ label, value, set }) {
  return <label className="space-y-1 text-sm"><span className="font-medium">{label}</span><textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2" value={value || ""} onChange={(event) => set(event.target.value)} /></label>;
}
