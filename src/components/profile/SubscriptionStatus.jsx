import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";

export default function SubscriptionStatus({ user }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const q = query(
          collection(db, "subscriptions"),
          where("userId", "==", user.id),
          where("active", "==", true),
          orderBy("createdAt", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setSubscription({
            id: querySnapshot.docs[0].id,
            ...querySnapshot.docs[0].data(),
          });
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user.id]);

  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Subscription Status</h3>
        <div className="h-6 w-24 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  const isActive = !!subscription?.active;
  const endDate = subscription?.endDate?.toDate
    ? subscription.endDate.toDate().toLocaleDateString()
    : "N/A";

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Subscription Status</h3>

      <div className="flex items-center gap-2">
        <Badge variant={isActive ? "success" : "outline"} className="px-3 py-1">
          {isActive ? "Active" : "Inactive"}
        </Badge>

        {isActive && (
          <div className="flex items-center text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4 mr-1" />
            <span>Renews on {endDate}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-2">
        {!isActive && (
          <Button asChild>
            <Link href="/membership">Subscribe Now</Link>
          </Button>
        )}

        {isActive && (
          <Button variant="outline" asChild>
            <Link href="/membership">Manage Subscription</Link>
          </Button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-sm">Access to monthly packages</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-sm">Exclusive game assets</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-sm">Tutorial videos</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-sm">Code snippets</span>
        </div>
      </div>
    </div>
  );
}
