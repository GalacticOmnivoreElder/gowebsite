"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "@/firebase";
import { SKILL_CATEGORIES } from "@/constants/skills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { Plus, RefreshCw, Search, Tags } from "lucide-react";

export default function SkillsPage() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [newSkill, setNewSkill] = useState({
    name: "",
    category: SKILL_CATEGORIES[0],
  });

  const request = useCallback(async (url, options = {}) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Your admin session has expired.");

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to update the skill directory.");
    }
    return data;
  }, []);

  const loadSkills = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request("/api/admin/skills");
      setSkills(data.skills || []);
    } catch (error) {
      toast({
        title: "Could not load skills",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const stats = useMemo(
    () => ({
      total: skills.length,
      active: skills.filter((skill) => skill.active).length,
      pending: skills.filter((skill) => skill.status === "pending").length,
      uses: skills.reduce(
        (total, skill) => total + (Number(skill.usageCount) || 0),
        0
      ),
    }),
    [skills]
  );

  const visibleSkills = useMemo(() => {
    const query = search.trim().toLowerCase();
    return skills.filter((skill) => {
      const matchesSearch =
        !query ||
        skill.name.toLowerCase().includes(query) ||
        skill.category.toLowerCase().includes(query);
      const matchesStatus =
        status === "all" ||
        (status === "active" && skill.active) ||
        (status === "pending" && skill.status === "pending") ||
        (status === "inactive" &&
          !skill.active &&
          skill.status !== "pending");
      return matchesSearch && matchesStatus;
    });
  }, [search, skills, status]);

  const addSkill = async (event) => {
    event.preventDefault();
    if (!newSkill.name.trim()) return;

    try {
      setBusy("create");
      const data = await request("/api/admin/skills", {
        method: "POST",
        body: JSON.stringify(newSkill),
      });
      setSkills((current) =>
        [...current.filter((skill) => skill.id !== data.skill.id), data.skill].sort(
          (a, b) => a.name.localeCompare(b.name)
        )
      );
      setNewSkill((current) => ({ ...current, name: "" }));
      toast({
        title: "Skill added",
        description: `${data.skill.name} is now available to the community.`,
      });
    } catch (error) {
      toast({
        title: "Could not add skill",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBusy("");
    }
  };

  const updateSkill = async (skill, update) => {
    try {
      setBusy(skill.id);
      const data = await request("/api/admin/skills", {
        method: "PUT",
        body: JSON.stringify({ id: skill.id, ...update }),
      });
      setSkills((current) =>
        current.map((entry) => (entry.id === skill.id ? data.skill : entry))
      );
      toast({
        title: data.skill.active ? "Skill approved" : "Skill hidden",
        description: `${data.skill.name} was updated.`,
      });
    } catch (error) {
      toast({
        title: "Could not update skill",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBusy("");
    }
  };

  const rebuildUsage = async () => {
    try {
      setBusy("rebuild");
      const data = await request("/api/admin/skills", {
        method: "POST",
        body: JSON.stringify({ action: "rebuild" }),
      });
      setSkills(data.skills || []);
      toast({
        title: "Usage recalculated",
        description: "Skill popularity now reflects all current profiles.",
      });
    } catch (error) {
      toast({
        title: "Could not recalculate usage",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-primary">
            <Tags className="h-4 w-4" />
            Community taxonomy
          </div>
          <h1 className="text-3xl font-bold">Master Skills Directory</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Approve community-created tags, organize the directory, and control
            which skills can appear publicly.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={rebuildUsage}
          disabled={Boolean(busy)}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${
              busy === "rebuild" ? "animate-spin" : ""
            }`}
          />
          Recalculate profile usage
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Directory skills", stats.total],
          ["Public skills", stats.active],
          ["Awaiting review", stats.pending],
          ["Profile uses", stats.uses],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{value}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add an approved skill</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={addSkill}
            className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px_auto] md:items-end"
          >
            <div className="space-y-2">
              <Label htmlFor="skill-name">Skill name</Label>
              <Input
                id="skill-name"
                value={newSkill.name}
                onChange={(event) =>
                  setNewSkill((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="e.g. Technical Art"
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-category">Category</Label>
              <Select
                value={newSkill.category}
                onValueChange={(category) =>
                  setNewSkill((current) => ({ ...current, category }))
                }
              >
                <SelectTrigger id="skill-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={busy === "create"}>
              <Plus className="mr-2 h-4 w-4" />
              Add skill
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle>Directory entries</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search skills"
                className="pl-9 sm:w-64"
                aria-label="Search skill directory"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="sm:w-40" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Public</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <div className="flex min-h-52 items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span className="sr-only">Loading skill directory</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Uses</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSkills.map((skill) => (
                  <TableRow key={skill.id}>
                    <TableCell className="font-medium">{skill.name}</TableCell>
                    <TableCell className="min-w-52">
                      <Select
                        value={skill.category}
                        onValueChange={(category) =>
                          updateSkill(skill, { category })
                        }
                        disabled={busy === skill.id}
                      >
                        <SelectTrigger
                          className="h-9 w-48"
                          aria-label={`Category for ${skill.name}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="capitalize">{skill.source}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          skill.active
                            ? "default"
                            : skill.status === "pending"
                            ? "secondary"
                            : "outline"
                        }
                        className={
                          skill.active ? "bg-primary text-primary-foreground" : ""
                        }
                      >
                        {skill.active ? "Public" : skill.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {skill.usageCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={skill.active ? "outline" : "default"}
                        onClick={() =>
                          updateSkill(skill, { active: !skill.active })
                        }
                        disabled={busy === skill.id}
                        aria-label={`${
                          skill.active ? "Hide" : "Approve"
                        } ${skill.name}`}
                      >
                        {skill.active ? "Hide" : "Approve"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {visibleSkills.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No skills match this view.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
