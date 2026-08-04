"use client";

import { useState } from "react";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function MakeAdminPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Bootstrap-only tool - hidden in production (admins are already provisioned).
  // Kept below the hooks so hook order stays stable (rules-of-hooks).
  const handleMakeAdmin = async (e) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const headers = {
        "Content-Type": "application/json",
      };

      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/admin/make-admin", {
        method: "POST",
        headers,
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success! 🎉",
          description: `${email} is now an admin!`,
        });
        setEmail("");
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to make user admin",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Make Admin</CardTitle>
          <CardDescription>
            Enter an email address to grant admin privileges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMakeAdmin} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Making Admin..." : "Make Admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
