"use client";

import { observer } from "mobx-react-lite";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { LoadingSpinner } from "@/reusable-ui/LoadingSpinner";
import { BlogCard } from "../blog/page";

const InitiativesPage = observer(() => {
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInitiatives = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/wordpress?category=initiative");

        if (!response.ok) {
          throw new Error("Failed to fetch initiatives");
        }

        const data = await response.json();
        setInitiatives(data);
      } catch (error) {
        console.error("Error fetching initiatives:", error);
        setError("Failed to load initiatives. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitiatives();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-4xl font-bold mb-8">Initiatives</h1>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Initiatives</h1>
      <p className="text-muted-foreground mb-8">
        Discover our community projects and initiatives aimed at supporting game
        developers and creators.
      </p>

      {initiatives.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {initiatives.map((initiative) => (
            <BlogCard key={initiative.id} post={initiative} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-xl mb-4">
            No initiatives available at the moment.
          </p>
          <p className="text-muted-foreground">
            Check back soon for our upcoming community initiatives!
          </p>
        </div>
      )}
    </div>
  );
});


export default InitiativesPage;
