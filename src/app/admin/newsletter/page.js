"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  Mail,
  RefreshCw,
  Search,
  ShieldBan,
  UserX,
} from "lucide-react";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";

export default function AdminNewsletterPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const authedRequest = useCallback(async (url, options = {}) => {
    const token = await auth.currentUser.getIdToken();
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authedRequest("/api/admin/newsletter");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load newsletter data");
      setData(result);
    } catch (error) {
      toast({ title: "Newsletter data unavailable", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [authedRequest]);

  useEffect(() => {
    load();
  }, [load]);

  const subscribers = useMemo(() => {
    if (!data?.subscribers) return [];
    const query = search.trim().toLowerCase();
    return query
      ? data.subscribers.filter(
          (item) =>
            String(item.email || "").includes(query) ||
            item.status.includes(query) ||
            item.source?.includes(query)
        )
      : data.subscribers;
  }, [data, search]);

  const action = async (subscriberId, name) => {
    if (
      ["suppress", "anonymize"].includes(name) &&
      !window.confirm(
        name === "anonymize"
          ? "Permanently remove personal subscriber data while retaining a one-way suppression hash?"
          : "Suppress this address from future newsletter delivery?"
      )
    ) {
      return;
    }
    try {
      const response = await authedRequest("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriberId, action: name }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Newsletter action failed");
      }
      toast({
        title:
          name === "suppress"
            ? "Subscriber suppressed"
            : name === "anonymize"
              ? "Subscriber data anonymized"
              : "Confirmation queued",
      });
      await load();
    } catch (error) {
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportCsv = async () => {
    const response = await authedRequest("/api/admin/newsletter?format=csv");
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "galactic-omnivore-newsletter.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return <p className="text-muted-foreground">Loading newsletter data…</p>;
  }

  const stats = data?.stats || {};
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Newsletter</h1>
          <p className="text-muted-foreground">
            Consent records, subscriber status, and delivery health.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Subscribed", stats.subscribed || 0],
          ["Pending", stats.pending || 0],
          ["Unsubscribed", stats.unsubscribed || 0],
          ["Suppressed / bounced", stats.suppressed || 0],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{value}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Signup growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.recent7Days || 0}</p>
            <p className="text-sm text-muted-foreground">
              last 7 days · {stats.recent30Days || 0} in 30 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Sources (latest 500)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(stats.sources || {}).map(([source, value]) => (
              <Badge key={source} variant="outline">
                {source}: {value}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Topic choices (latest 500)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(stats.topics || {}).map(([topic, value]) => (
              <Badge key={topic} variant="outline">
                {topic}: {value}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Delivery health</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Latest 100 verified provider events. Opens and clicks are omitted
              unless tracking is explicitly enabled.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link
              href="https://resend.com/broadcasts"
              target="_blank"
              rel="noopener noreferrer"
            >
              Resend Broadcasts <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(stats.deliveryHealth || {}).map(([event, value]) => (
            <Badge key={event} variant="outline">
              {event}: {value}
            </Badge>
          ))}
          {Object.keys(stats.deliveryHealth || {}).length === 0 && (
            <p className="text-sm text-muted-foreground">
              No delivery events recorded yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle>Subscribers</CardTitle>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search email, status, or source"
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell className="font-medium">
                      {subscriber.email || "Anonymized"}
                    </TableCell>
                    <TableCell><Badge variant="outline">{subscriber.status}</Badge></TableCell>
                    <TableCell>{subscriber.source || "unknown"}</TableCell>
                    <TableCell>
                      {subscriber.updatedAt
                        ? new Date(subscriber.updatedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {subscriber.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => action(subscriber.id, "resend_confirmation")}
                          >
                            <Mail className="h-4 w-4 mr-1" /> Resend
                          </Button>
                        )}
                        {!["suppressed", "complained"].includes(subscriber.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => action(subscriber.id, "suppress")}
                          >
                            <ShieldBan className="h-4 w-4 mr-1" /> Suppress
                          </Button>
                        )}
                        {["suppressed", "bounced", "complained", "unsubscribed"].includes(
                          subscriber.status
                        ) &&
                          subscriber.email && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => action(subscriber.id, "anonymize")}
                            >
                              <UserX className="h-4 w-4 mr-1" /> Anonymize
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent consent history</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data?.events || []).slice(0, 20).map((event) => (
              <div
                key={event.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b pb-3 text-sm"
              >
                <span>
                  <Badge variant="outline" className="mr-2">
                    {event.eventType}
                  </Badge>
                  {event.source || "system"}
                </span>
                <span className="text-muted-foreground">
                  {event.occurredAt
                    ? new Date(event.occurredAt).toLocaleString()
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
