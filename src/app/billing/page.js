"use client";

import { observer } from "mobx-react-lite";
import MobxStore from "@/mobx";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { auth } from "@/firebase";
import SubscribeButton from "@/components/ui/SubscribeButton";

// Helper function to safely convert Firestore timestamp to Date
const convertToDate = (timestamp) => {
  if (!timestamp) return null;

  // If it's already a Date object
  if (timestamp instanceof Date) return timestamp;

  // Handle Firestore timestamp with _seconds property (most common case)
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000);
  }

  // Handle regular Firestore timestamp with seconds property
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }

  // If it's a string, try to parse it
  if (typeof timestamp === "string") {
    return new Date(timestamp);
  }

  // If it's a number (Unix timestamp)
  if (typeof timestamp === "number") {
    return new Date(timestamp * 1000);
  }

  // Last resort: try toDate method
  try {
    if (
      timestamp &&
      timestamp.toDate &&
      typeof timestamp.toDate === "function"
    ) {
      return timestamp.toDate();
    }
  } catch (error) {
    console.error("Failed to convert timestamp:", error);
  }

  return null;
};

const BillingPage = observer(() => {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Redirect if not logged in
    if (!MobxStore.user) {
      router.push("/login?redirect=/billing");
      return;
    }

    fetchBillingData();
  }, [MobxStore.user]);

  const fetchBillingData = async () => {
    if (!auth.currentUser) return;

    try {
      const token = await auth.currentUser.getIdToken();

      // Fetch orders and subscription details
      const [ordersResponse, subscriptionResponse] = await Promise.all([
        fetch("/api/billing/orders", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/billing/subscription", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.orders || []);
      }

      if (subscriptionResponse.ok) {
        const subData = await subscriptionResponse.json();
        setSubscriptionDetails(subData.subscription);
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      console.log("🔄 Manually refreshing billing data...");

      // Refresh user data first
      await MobxStore.checkAuth();

      // Then refresh billing data
      await fetchBillingData();

      console.log("✅ Billing data refreshed successfully");
    } catch (error) {
      console.error("❌ Failed to refresh billing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();

      // Make an authenticated request to get the portal URL
      const response = await fetch("/api/subscription/portal", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.portal_url) {
          window.location.href = data.portal_url;
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to open billing portal");
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
      alert(
        "Failed to open billing portal. Please try again or contact support."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? You'll keep access until the end of your current billing period."
      )
    ) {
      return;
    }

    setCanceling(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();

        // Refresh user data and billing data
        await MobxStore.checkAuth();
        await fetchBillingData();

        alert(
          result.endsAt
            ? `Subscription canceled successfully. You'll keep access until ${new Date(
                result.endsAt
              ).toLocaleDateString()}.`
            : "Subscription canceled successfully. You'll keep access until the end of your billing period."
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      alert(
        `Failed to cancel subscription: ${error.message}. Please try again or contact support.`
      );
    } finally {
      setCanceling(false);
    }
  };

  const getSubscriptionStatusInfo = () => {
    const user = MobxStore.user;

    if (!user?.activeMember) {
      return {
        status: "inactive",
        title: "No Active Subscription",
        description: "Subscribe to access premium content",
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        variant: "destructive",
      };
    }

    // Check if subscription is canceled
    if (user.subscriptionStatus === "canceled") {
      let endDate = null;
      let daysLeft = 0;

      // Use the safe date conversion function
      endDate = convertToDate(user.subscriptionEndsAt);

      if (endDate) {
        const now = new Date();
        const timeDiff = endDate.getTime() - now.getTime();
        daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
      }

      return {
        status: "canceled",
        title: "Subscription Canceled",
        description:
          daysLeft > 0
            ? `Access ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`
            : "Access has ended",
        icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
        variant: "default",
      };
    }

    return {
      status: "active",
      title: "Active Subscription",
      description: "Your subscription is active and up to date",
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      variant: "default",
    };
  };

  const getActualPrice = () => {
    // Try to get price from subscription details first
    if (subscriptionDetails?.price?.amount) {
      return (subscriptionDetails.price.amount / 100).toFixed(2);
    }

    // Fallback to order data
    if (orders.length > 0) {
      const latestOrder = orders[0];
      return (latestOrder.amount / 100).toFixed(2);
    }

    // Default fallback
    return "15.00";
  };

  // Clean function to get next billing date
  const getNextBillingInfo = () => {
    const user = MobxStore.user;

    if (!user?.subscriptionEndsAt) {
      return { date: "Unknown", description: "No subscription data" };
    }

    // Convert Firestore timestamp to Date
    const billingDate = convertToDate(user.subscriptionEndsAt);

    if (!billingDate) {
      return { date: "Unknown", description: "Invalid date" };
    }

    const isRenewing = user.willRenew === true;

    return {
      date: billingDate.toLocaleDateString(),
      description: isRenewing ? "Auto-renewal date" : "Final access date",
    };
  };

  // Show loading while checking auth
  if (!MobxStore.user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statusInfo = getSubscriptionStatusInfo();
  const user = MobxStore.user;
  const actualPrice = getActualPrice();
  const nextBillingInfo = getNextBillingInfo();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Billing & Subscription
              </h1>
              <p className="text-muted-foreground">
                Manage your subscription and view payment history
              </p>
            </div>
          </div>

          {/* Refresh Button */}
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh Status"}
          </Button>
        </div>

        {/* Subscription Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Subscription Overview
            </CardTitle>
            <CardDescription>
              Your current subscription details and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant={statusInfo.variant}>
              <AlertDescription className="flex items-center">
                {statusInfo.icon}
                <div className="ml-2">
                  <div className="font-medium">{statusInfo.title}</div>
                  <div className="text-sm">{statusInfo.description}</div>
                </div>
              </AlertDescription>
            </Alert>

            {user?.activeMember && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Plan</p>
                  </div>
                  <p className="text-lg">Monthly Subscription</p>
                  <p className="text-sm text-muted-foreground">
                    ${actualPrice} per month
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {user?.willRenew ? "Next Billing" : "Access Ends"}
                    </p>
                  </div>
                  <p className="text-lg">{nextBillingInfo.date}</p>
                  <p className="text-sm text-muted-foreground">
                    {nextBillingInfo.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Status</p>
                  </div>
                  <Badge
                    variant={
                      user.subscriptionStatus === "active"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {user.subscriptionStatus || "active"}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            {user?.activeMember ? (
              <Button
                onClick={handleManageSubscription}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Opening Portal..." : "Manage Subscription"}
              </Button>
            ) : (
              <SubscribeButton className="flex-1">
                Subscribe Now
              </SubscribeButton>
            )}
          </CardFooter>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>
              Your subscription payments - download invoices from the customer
              portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order, index) => (
                  <div key={order.id}>
                    <div className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Monthly Subscription</p>
                          <p className="text-sm text-muted-foreground">
                            {(() => {
                              const paidDate =
                                convertToDate(order.paidAt) ||
                                convertToDate(order.createdAt);
                              return paidDate
                                ? paidDate.toLocaleDateString()
                                : "Unknown Date";
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">
                            ${(order.amount / 100).toFixed(2)}
                          </p>
                          <Badge
                            variant={
                              order.status === "paid" ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {index < orders.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No payment history available
                </p>
                <p className="text-sm text-muted-foreground">
                  Your payments will appear here once you subscribe
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions for non-members */}
        {!user?.activeMember && (
          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>
                Subscribe to access premium content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Join our community and get access to exclusive features and
                content.
              </p>
            </CardContent>
            <CardFooter>
              <SubscribeButton>
                Subscribe Now - ${actualPrice}/month
              </SubscribeButton>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
});

export default BillingPage;
