"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const checklistKeys = ["files", "contributorRights", "license", "compatibility", "previewImage", "downloadUrl", "entitlement", "supportStatus"];
const emptyReview = (item) => ({ reviewState: item.reviewState, reviewChecklist: item.reviewChecklist || {}, currentSupportStatus: item.currentSupportStatus || "", reason: "" });

export default function ResourceReviewPage() {
  const [filters, setFilters] = useState({ title: "", date: "", status: "", contributor: "", id: "" });
  const [resources, setResources] = useState(null);
  const [message, setMessage] = useState("");
  const [reviews, setReviews] = useState({});
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (url, options = {}) => {
    const token = await auth.currentUser?.getIdToken();
    return fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` }, cache: "no-store" });
  }, []);

  const load = useCallback(async () => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    const response = await call(`/api/admin/resources-review?${query}`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Resources could not be loaded");
    setResources(result.resources);
    setReviews(Object.fromEntries(result.resources.map((item) => [item.id, emptyReview(item)])));
  }, [call, filters]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => load().catch((error) => setMessage(error.message)));
    return unsubscribe;
  }, [load]);

  const save = async (resourceId, action) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await call("/api/admin/resources-review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId, action, ...reviews[resourceId] }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Review could not be saved");
      setMessage(action === "mark_legacy" ? "Resource marked Legacy and audited." : "Review checklist saved and audited.");
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Legacy Resource Review</h1>
        <p className="mt-2 text-muted-foreground">Search existing records and explicitly review or mark them Legacy. No production record is changed automatically.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {Object.keys(filters).map((key) => key === "status" ? (
          <select key={key} aria-label="Status filter" className="rounded-md border bg-background px-3 py-2" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All statuses</option><option value="published">Published</option><option value="legacy">Legacy</option><option value="draft">Draft</option>
          </select>
        ) : (
          <Input key={key} aria-label={`${key} filter`} placeholder={key} value={filters[key]} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))} />
        ))}
      </div>
      {message ? <p role="status" className="rounded-md border p-3 text-sm">{message}</p> : null}
      {!resources ? <p>Loading resources...</p> : resources.length ? (
        <div className="space-y-4">
          {resources.map((resource) => {
            const review = reviews[resource.id] || { reviewChecklist: {}, reason: "" };
            const readyForLegacy = review.reviewState === "cleared" && checklistKeys.every((key) => review.reviewChecklist?.[key] === true) && review.reason?.trim();
            return (
              <Card key={resource.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-semibold">{resource.title}</p><p className="text-xs text-muted-foreground">{resource.id} - {resource.month} {resource.year} - {resource.contributorName || "Contributor not recorded"}</p></div>
                    <Badge>{resource.status}</Badge>
                  </div>
                  <select aria-label={`Review state for ${resource.title}`} className="rounded-md border bg-background px-3 py-2" value={review.reviewState || "pending"} onChange={(event) => setReviews((current) => ({ ...current, [resource.id]: { ...review, reviewState: event.target.value } }))}>
                    {["pending", "in_review", "cleared", "changes_required"].map((state) => <option key={state}>{state}</option>)}
                  </select>
                  <fieldset>
                    <legend className="text-sm font-medium">Review checklist</legend>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {checklistKeys.map((key) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={review.reviewChecklist?.[key] === true} onChange={(event) => setReviews((current) => ({ ...current, [resource.id]: { ...review, reviewChecklist: { ...review.reviewChecklist, [key]: event.target.checked } } }))} />{key}</label>)}
                    </div>
                  </fieldset>
                  <Input aria-label={`Current support status for ${resource.title}`} placeholder="Current support status" value={review.currentSupportStatus || ""} onChange={(event) => setReviews((current) => ({ ...current, [resource.id]: { ...review, currentSupportStatus: event.target.value } }))} />
                  <Input aria-label={`Review reason for ${resource.title}`} placeholder="Reason required for every review change" value={review.reason || ""} onChange={(event) => setReviews((current) => ({ ...current, [resource.id]: { ...review, reason: event.target.value } }))} />
                  <div className="flex gap-2">
                    <Button disabled={busy || !review.reason?.trim()} variant="outline" onClick={() => save(resource.id, "save_review")}>Save review</Button>
                    {resource.status !== "legacy" ? <Button disabled={busy || !readyForLegacy} onClick={() => save(resource.id, "mark_legacy")}>Mark Legacy</Button> : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : <p className="rounded-md border p-8 text-center text-muted-foreground">No resources match these filters.</p>}
    </div>
  );
}
