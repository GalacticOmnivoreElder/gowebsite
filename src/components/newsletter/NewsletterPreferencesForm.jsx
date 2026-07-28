"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewsletterPreferencesForm({ token, showUnsubscribePrompt = false }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setMessage(
        "This preferences link is invalid. Use the link from a Galactic Omnivore email."
      );
      setState("error");
      return undefined;
    }

    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(
          `/api/newsletter/preferences?token=${encodeURIComponent(token)}`,
          { cache: "no-store", signal: controller.signal }
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMessage(body.error || "This preferences link is invalid.");
          setState("error");
          return;
        }
        setData(body);
        setState("ready");
      } catch (error) {
        if (error.name === "AbortError") return;
        setMessage("Newsletter preferences are temporarily unavailable.");
        setState("error");
      }
    };
    load();
    return () => controller.abort();
  }, [token]);

  const save = async ({ unsubscribe = false } = {}) => {
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/newsletter/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, topics: data.topics, unsubscribe }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          body.error || "Could not save newsletter preferences."
        );
      }
      setState("saved");
      setMessage(
        body.status === "unsubscribed"
          ? "You have been unsubscribed."
          : "Your newsletter preferences have been saved."
      );
      if (body.status === "unsubscribed") {
        setData((current) => ({ ...current, status: "unsubscribed" }));
      }
    } catch (error) {
      setMessage(error.message);
      setState("error");
    }
  };

  if (state === "loading") {
    return <p className="text-muted-foreground">Loading preferences…</p>;
  }
  if (state === "error" && !data) {
    return <p className="text-destructive">{message}</p>;
  }

  const updateTopic = (key, checked) => {
    setData((current) => ({
      ...current,
      topics: { ...current.topics, [key]: checked },
    }));
    if (state === "saved") setState("ready");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Newsletter preferences</CardTitle>
        <p className="text-sm text-muted-foreground">
          Preferences for {data.email}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {showUnsubscribePrompt && data.status !== "unsubscribed" && (
          <p className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm">
            To stop all newsletter messages, choose “Unsubscribe from all”
            below. No account login is required.
          </p>
        )}
        {[
          ["newsletter", "Galactic Omnivore newsletter"],
          ["newPackages", "New community resource drops"],
          ["promotions", "Promotions and special offers"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={data.topics?.[key] === true}
              disabled={state === "saving" || data.status === "unsubscribed"}
              onChange={(event) => updateTopic(key, event.target.checked)}
            />
            <span>{label}</span>
          </label>
        ))}

        {message && (
          <p
            className={
              state === "error" ? "text-sm text-destructive" : "text-sm text-green-600"
            }
            role="status"
          >
            {message}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={() => save()}
            disabled={state === "saving" || data.status === "unsubscribed"}
          >
            {state === "saving" ? "Saving…" : "Save preferences"}
          </Button>
          <Button
            variant="outline"
            onClick={() => save({ unsubscribe: true })}
            disabled={state === "saving" || data.status === "unsubscribed"}
          >
            Unsubscribe from all
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
