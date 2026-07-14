"use client";

import { useState, useEffect } from "react";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestPolarPage() {
  const [user, setUser] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        // Test the auth verification endpoint
        try {
          const token = await user.getIdToken();
          const response = await fetch("/api/auth/verify", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json();
          setSubscriptionData(data);
        } catch (error) {
          console.error("Error fetching subscription data:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCheckout = () => {
    // Redirect to your checkout endpoint
    window.location.href = "/api/checkout";
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Polar.sh Integration Test</h1>

      {!user ? (
        <Card>
          <CardContent className="p-6">
            <p>Please log in to test the subscription system.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Info</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>UID:</strong> {user.uid}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription Status</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionData ? (
                <div className="space-y-2">
                  <p>
                    <strong>Is Member:</strong>{" "}
                    {subscriptionData.permissions?.isMember ? "Yes" : "No"}
                  </p>
                  <p>
                    <strong>Can Access Packages:</strong>{" "}
                    {subscriptionData.permissions?.canAccessPackages
                      ? "Yes"
                      : "No"}
                  </p>
                  {subscriptionData.subscription && (
                    <>
                      <p>
                        <strong>Subscription ID:</strong>{" "}
                        {subscriptionData.subscription.subscriptionId}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        {subscriptionData.subscription.subscriptionStatus}
                      </p>
                      <p>
                        <strong>Will Renew:</strong>{" "}
                        {subscriptionData.subscription.willRenew ? "Yes" : "No"}
                      </p>
                      {subscriptionData.subscription.subscriptionEndsAt && (
                        <p>
                          <strong>Ends At:</strong>{" "}
                          {new Date(
                            subscriptionData.subscription.subscriptionEndsAt
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p>Loading subscription data...</p>
              )}
            </CardContent>
          </Card>

          {!subscriptionData?.permissions?.isMember && (
            <Card>
              <CardHeader>
                <CardTitle>Subscribe</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  You don&apos;t have an active subscription. Click below to
                  subscribe:
                </p>
                <Button onClick={handleCheckout}>
                  Subscribe with Polar.sh
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
