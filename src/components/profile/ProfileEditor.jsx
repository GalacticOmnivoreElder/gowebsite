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

import { SOCIAL_PLATFORMS } from "@/constants/skills";
import {
  countWords,
  MAX_PROFILE_ABOUT_WORDS,
  MAX_PROFILE_BIO_LENGTH,
  validateProfileData,
} from "@/utils/validateProfile";
import { SkillSelector } from "@/components/profile/SkillSelector";

const ProfileEditor = observer(({ onSave }) => {
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    aboutMe: "",
    skills: [],
    socialLinks: {},
    socialVisibility: {},
    profilePrivacy: "public",
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
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
          const legacyLongBio =
            !profileData.aboutMe &&
            String(profileData.bio || "").length > MAX_PROFILE_BIO_LENGTH
              ? String(profileData.bio)
              : "";
          setFormData({
            username: profileData.username || "",
            bio: legacyLongBio ? "" : profileData.bio || "",
            aboutMe: profileData.aboutMe || legacyLongBio,
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

  const updateSocialLink = (platform, value) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    }));
    setFieldErrors((prev) => {
      const errorKey = `socialLinks.${platform}`;
      if (!prev[errorKey]) return prev;
      const nextErrors = { ...prev };
      delete nextErrors[errorKey];
      return nextErrors;
    });
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

    const validationErrors = validateProfileData(formData);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      toast({
        title: "Validation error",
        description: Object.values(validationErrors)[0],
        variant: "destructive",
      });
      return;
    }

    setFieldErrors({});

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

      const updatedProfile = await response.json();

      // The server write above is authoritative. Refresh the local store instead
      // of issuing a second client-side Firestore write, which can fail under
      // stricter production security rules and produce a misleading partial save.
      await MobxStore.checkAuth();

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });

      // Call onSave callback to exit edit mode
      if (onSave) {
        onSave(updatedProfile);
      }
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
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

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
                maxLength={30}
                className={fieldErrors.username ? "border-red-500" : ""}
              />
              {fieldErrors.username && (
                <p className="text-sm text-red-500 mt-1">{fieldErrors.username}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Short bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="A short introduction shown near your name"
              rows={3}
              maxLength={MAX_PROFILE_BIO_LENGTH}
              className={fieldErrors.bio ? "border-red-500" : ""}
            />
            <div className="flex justify-between mt-1">
              {fieldErrors.bio ? (
                <p className="text-sm text-red-500">{fieldErrors.bio}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-muted-foreground">
                {formData.bio.length.toLocaleString()}/
                {MAX_PROFILE_BIO_LENGTH.toLocaleString()}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="aboutMe">About Me</Label>
            <Textarea
              id="aboutMe"
              value={formData.aboutMe}
              onChange={(e) => handleInputChange("aboutMe", e.target.value)}
              placeholder="Share your background, interests, goals, and the work you want to do."
              rows={10}
              aria-invalid={Boolean(fieldErrors.aboutMe) || undefined}
              className={fieldErrors.aboutMe ? "border-red-500" : ""}
            />
            <div className="flex justify-between mt-1">
              {fieldErrors.aboutMe ? (
                <p className="text-sm text-red-500">{fieldErrors.aboutMe}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-muted-foreground">
                {countWords(formData.aboutMe).toLocaleString()}/
                {MAX_PROFILE_ABOUT_WORDS.toLocaleString()} words
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle>Skills & Expertise</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillSelector
            value={formData.skills}
            onChange={(skills) => handleInputChange("skills", skills)}
          />
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
                type={platform.inputType || "url"}
                value={formData.socialLinks[platform.key] || ""}
                onChange={(e) => updateSocialLink(platform.key, e.target.value)}
                placeholder={platform.placeholder}
                autoComplete={platform.key === "email" ? "email" : "off"}
                aria-invalid={
                  Boolean(fieldErrors[`socialLinks.${platform.key}`]) ||
                  undefined
                }
                aria-describedby={
                  fieldErrors[`socialLinks.${platform.key}`] ||
                  platform.helperText
                    ? `${platform.key}-help`
                    : undefined
                }
                className={
                  fieldErrors[`socialLinks.${platform.key}`]
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }
              />
              {(fieldErrors[`socialLinks.${platform.key}`] ||
                platform.helperText) && (
                <p
                  id={`${platform.key}-help`}
                  className={`text-xs ${
                    fieldErrors[`socialLinks.${platform.key}`]
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {fieldErrors[`socialLinks.${platform.key}`] ||
                    platform.helperText}
                </p>
              )}
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
