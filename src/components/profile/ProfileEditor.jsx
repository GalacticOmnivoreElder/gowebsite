"use client";

import { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { auth } from "@/firebase";
import MobxStore from "@/mobx";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  X,
  Save,
  Eye,
  EyeOff,
  User,
  Lock,
  Globe,
  Mail,
  ExternalLink,
} from "lucide-react";

import { GAMING_TECH_SKILLS, SOCIAL_PLATFORMS } from "@/constants/skills";

const ProfileEditor = observer(() => {
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    skills: [],
    socialLinks: {},
    socialVisibility: {},
    profilePrivacy: "public",
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!MobxStore.user) return;

      try {
        setLoading(true);
        const token = await auth.currentUser.getIdToken();

        const response = await fetch(`/api/user/${MobxStore.user.uid}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const profileData = await response.json();
          setFormData({
            username: profileData.username || "",
            bio: profileData.bio || "",
            skills: profileData.skills || [],
            socialLinks: profileData.socialLinks || {},
            socialVisibility: profileData.socialVisibility || {},
            profilePrivacy: profileData.profilePrivacy || "public",
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addSkill = (skill) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skill],
      }));
    }
  };

  const removeSkill = (skill) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const updateSocialLink = (platform, value) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    }));
  };

  const updateSocialVisibility = (platform, visible) => {
    setFormData((prev) => ({
      ...prev,
      socialVisibility: {
        ...prev.socialVisibility,
        [platform]: visible,
      },
    }));
  };

  const removeSocialLink = (platform) => {
    setFormData((prev) => {
      const newSocialLinks = { ...prev.socialLinks };
      const newSocialVisibility = { ...prev.socialVisibility };
      delete newSocialLinks[platform];
      delete newSocialVisibility[platform];

      return {
        ...prev,
        socialLinks: newSocialLinks,
        socialVisibility: newSocialVisibility,
      };
    });
  };

  const handleSave = async () => {
    if (!MobxStore.user) return;

    try {
      setSaving(true);
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(`/api/user/${MobxStore.user.uid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      // Update MobxStore user data
      await MobxStore.updateUser({
        username: formData.username,
        bio: formData.bio,
        skills: formData.skills,
        socialLinks: formData.socialLinks,
        socialVisibility: formData.socialVisibility,
        profilePrivacy: formData.profilePrivacy,
      });

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const availableSkills = GAMING_TECH_SKILLS.filter(
    (skill) => !formData.skills.includes(skill)
  );

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={MobxStore.user?.avatar} />
              <AvatarFallback className="text-2xl">
                {formData.username?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="Tell others about yourself..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle>Skills & Expertise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Add Skills</Label>
            <Select onValueChange={addSkill}>
              <SelectTrigger>
                <SelectValue placeholder="Select a skill to add" />
              </SelectTrigger>
              <SelectContent>
                {availableSkills.map((skill) => (
                  <SelectItem key={skill} value={skill}>
                    {skill}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {skill}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeSkill(skill)}
                />
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {SOCIAL_PLATFORMS.map((platform) => (
            <div key={platform.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={platform.key}>{platform.label}</Label>
                {formData.socialLinks[platform.key] && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {formData.socialVisibility[platform.key] ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                      <span>
                        {formData.socialVisibility[platform.key]
                          ? "Public"
                          : "Private"}
                      </span>
                    </div>
                    <Switch
                      checked={formData.socialVisibility[platform.key] || false}
                      onCheckedChange={(checked) =>
                        updateSocialVisibility(platform.key, checked)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSocialLink(platform.key)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <Input
                id={platform.key}
                value={formData.socialLinks[platform.key] || ""}
                onChange={(e) => updateSocialLink(platform.key, e.target.value)}
                placeholder={platform.placeholder}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Profile Visibility</Label>
              <p className="text-sm text-muted-foreground">
                Control who can see your profile information
              </p>
            </div>
            <Select
              value={formData.profilePrivacy}
              onValueChange={(value) =>
                handleInputChange("profilePrivacy", value)
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Public
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Private
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            {formData.profilePrivacy === "public" ? (
              <p>
                ✅ Your profile is visible to everyone. Others can see your bio,
                skills, and public social links.
              </p>
            ) : (
              <p>
                🔒 Your profile is private. Only your username and avatar are
                visible to others.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
});

export default ProfileEditor;
