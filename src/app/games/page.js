"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/reusable-ui/LoadingSpinner";

function isGameProject(project) {
  const values = [
    project.type,
    project.title,
    ...(Array.isArray(project.categoryTags) ? project.categoryTags : []),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return values.some((value) => value.includes("game"));
}

export default function GamesPage() {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/projects?status=all&limit=100", {
          cache: "no-store",
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Games could not be loaded.");
        if (active) {
          setProjects(Array.isArray(result.projects) ? result.projects : []);
          setStatus("ready");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Games could not be loaded.");
          setStatus("error");
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const games = useMemo(() => projects.filter(isGameProject), [projects]);

  if (status === "loading") return <LoadingSpinner />;

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <Gamepad2 className="h-9 w-9 text-primary" aria-hidden="true" />
          <h1 className="text-4xl font-bold">Games</h1>
        </div>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Discover approved games and playable work created through the GO community.
          Each entry links to its project, team, goals, and current opportunities.
        </p>
      </header>

      {status === "error" ? (
        <Card><CardContent className="p-8 text-center"><p role="alert" className="text-destructive">{error}</p></CardContent></Card>
      ) : null}

      {status === "ready" && games.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <Card key={game.id} className="overflow-hidden">
              {game.thumbnail ? (
                <div className="relative aspect-video">
                  <Image src={game.thumbnail} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
              ) : null}
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{game.title}</CardTitle>
                  <Badge variant="outline">{game.type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">{game.description || game.goal}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(game.categoryTags || []).slice(0, 4).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </div>
                <Button asChild className="mt-6 w-full"><Link href={`/project/${game.id}`}>View project</Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {status === "ready" && !games.length ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No approved game projects are listed right now.</CardContent></Card>
      ) : null}
    </main>
  );
}
