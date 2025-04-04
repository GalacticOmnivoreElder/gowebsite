"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { db, auth } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import SubscriptionStatus from "./SubscriptionStatus";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function ProfileInfo({
  user,
  permissions,
  isMember,
  hasActiveSubscription,
}) {
  const [name, setName] = useState(user.name || "");
  const [username, setUsername] = useState(user.username || "");
  const [updating, setUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpdateProfile = async () => {
    if (!name.trim() || !username.trim()) {
      toast({
        title: "Error",
        description: "Name and username cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch("/api/user/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          user: {
            name,
            username,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  // const handleImageUpload = async (e) => {
  //   const file = e.target.files[0];
  //   if (!file) return;

  //   const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  //   if (!allowedTypes.includes(file.type)) {
  //     toast({
  //       title: "Invalid File",
  //       description: "Please upload a valid image file (JPEG, PNG, or GIF).",
  //       variant: "destructive",
  //     });
  //     return;
  //   }

  //   setIsUploading(true);
  //   try {
  //     const storageRef = ref(storage, `profile-images/${user.id}`);
  //     await uploadBytes(storageRef, file);
  //     const downloadURL = await getDownloadURL(storageRef);

  //     const userRef = doc(db, "users", user.id);
  //     await updateDoc(userRef, {
  //       profileImage: downloadURL,
  //     });

  //     if (auth.currentUser) {
  //       await updateProfile(auth.currentUser, {
  //         photoURL: downloadURL,
  //       });
  //     }

  //     toast({
  //       title: "Image Uploaded",
  //       description: "Your profile image has been updated successfully.",
  //     });

  //     // Force a page refresh to show the new image
  //     window.location.reload();
  //   } catch (error) {
  //     console.error("Error uploading image:", error);
  //     toast({
  //       title: "Upload Failed",
  //       description: "Failed to upload image. Please try again.",
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setIsUploading(false);
  //   }
  // };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Determine subscription status
  const subscriptionStatus =
    hasActiveSubscription === true || isMember === true ? "Active" : "Inactive";

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Personal Information</h2>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Update button moved up here */}
            <Button
              onClick={handleUpdateProfile}
              disabled={updating}
              className="w-full md:w-auto"
            >
              {updating ? "Updating..." : "Update Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Subscription Status</h2>

          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Status:</span>
            <Badge
              variant={
                subscriptionStatus === "Active" ? "success" : "destructive"
              }
            >
              {subscriptionStatus}
            </Badge>
          </div>

          <p className="text-muted-foreground mb-4">
            {subscriptionStatus === "Active"
              ? "You have an active subscription with access to all current assets."
              : "You don't have an active subscription. Subscribe to access premium assets."}
          </p>

          <Button
            variant={subscriptionStatus === "Active" ? "outline" : "default"}
            className="w-full"
            asChild
          >
            {subscriptionStatus === "Active" ? (
              <span>Subscribed</span>
            ) : (
              <Link href="/membership">Subscribe Now</Link>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
