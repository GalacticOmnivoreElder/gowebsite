"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
}

function formatAmount(amount, currency = "USD") {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function SubscriptionsPage() {
  const [billingData, setBillingData] = useState({
    subscriptions: [],
    orders: [],
    events: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchBillingData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/billing", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch billing data");
      }

      setBillingData(await response.json());
    } catch (error) {
      console.error("Error fetching billing data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing Management</h1>
          <p className="text-muted-foreground">
            Polar subscriptions, paid orders, and webhook events.
          </p>
        </div>
        <Button onClick={fetchBillingData}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Tracked Subscribers</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {billingData.subscriptions.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stored Orders</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {billingData.orders.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {billingData.events.length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Users with Polar subscription/customer state.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead>Access Ends</TableHead>
                <TableHead>Polar Customer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingData.subscriptions.map((subscription) => (
                <TableRow key={subscription.userId}>
                  <TableCell>
                    <div className="font-medium">{subscription.username}</div>
                    <div className="text-sm text-muted-foreground">
                      {subscription.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={subscription.activeMember ? "default" : "secondary"}>
                      {subscription.subscriptionStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{subscription.willRenew ? "Renews" : "Stops"}</TableCell>
                  <TableCell>{formatDate(subscription.subscriptionEndsAt)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {subscription.polarCustomerId || "N/A"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Latest 100 stored Polar orders.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Order ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingData.orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.username}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.userEmail}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.status === "paid" ? "default" : "secondary"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatAmount(order.amount, order.currency)}</TableCell>
                  <TableCell>{formatDate(order.paidAt || order.createdAt)}</TableCell>
                  <TableCell className="font-mono text-xs">{order.polarOrderId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Latest 100 subscription lifecycle events.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Access Ends</TableHead>
                <TableHead>Subscription ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingData.events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="font-medium">{event.username}</div>
                    <div className="text-sm text-muted-foreground">
                      {event.userEmail}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{event.eventType}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(event.processedAt)}</TableCell>
                  <TableCell>{formatDate(event.accessEndsAt)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {event.subscriptionId || "N/A"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
