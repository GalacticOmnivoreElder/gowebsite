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
  Check,
} from "lucide-react";

import {
  LANDING_FALLBACK_SKILLS,
  SOCIAL_PLATFORMS,
} from "@/constants/skills";
import {
  MAX_PROFILE_SKILLS,
  MAX_SKILL_NAME_LENGTH,
  getSkillKey,
  normalizeSkillName,
} from "@/lib/skills";
import {
  MAX_PROFILE_BIO_LENGTH,
  validateProfileData,
} from "@/utils/validateProfile";

const ProfileEditor = observer(({ onSave }) => {
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [popularSkills, setPopularSkills] = useState(LANDING_FALLBACK_SKILLS);
  const [customSkill, setCustomSkill] = useState("");

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

  useEffect(() => {
    const loadPopularSkills = async () => {
      try {
        const response = await fetch("/api/skills?popular=true&limit=20");
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data.skills) && data.skills.length > 0) {
          setPopularSkills(data.skills.map((skill) => skill.name));
        }
      } catch (error) {
        console.error("Error loading popular skills:", error);
      }
    };

    loadPopularSkills();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addSkill = (skill) => {
    const normalizedSkill = normalizeSkillName(skill);
    if (!normalizedSkill) return;
    if (normalizedSkill.length > MAX_SKILL_NAME_LENGTH) {
      toast({
        title: "Skill name is too long",
        description: `Use ${MAX_SKILL_NAME_LENGTH} characters or fewer.`,
        variant: "destructive",
      });
      return;
    }
    if (formData.skills.length >= MAX_PROFILE_SKILLS) {
      toast({
        title: "Skill limit reached",
        description: `Profiles can include up to ${MAX_PROFILE_SKILLS} skills.`,
        variant: "destructive",
      });
      return;
    }
    if (
      formData.skills.some(
        (existingSkill) =>
          getSkillKey(existingSkill) === getSkillKey(normalizedSkill)
      )
    ) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, normalizedSkill],
    }));
    setCustomSkill("");
  };

  const removeSkill = (skill) => {
    const skillKey = getSkillKey(skill);
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter(
        (selectedSkill) => getSkillKey(selectedSkill) !== skillKey
      ),
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

      // Update MobxStore user data
      await MobxStore.updateUser({
        username: updatedProfile.username,
        bio: updatedProfile.bio,
        skills: updatedProfile.skills,
        socialLinks: updatedProfile.socialLinks,
        socialVisibility: updatedProfile.socialVisibility,
        profilePrivacy: updatedProfile.profilePrivacy,
      });

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
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="Tell others about yourself..."
              rows={4}
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
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle>Skills & Expertise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Popular community skills</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose from the skills used most often across community
                profiles.
              </p>
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Popular community skills"
            >
              {popularSkills.map((skill) => {
                const selected = formData.skills.some(
                  (selectedSkill) =>
                    getSkillKey(selectedSkill) === getSkillKey(skill)
                );
                const limitReached =
                  formData.skills.length >= MAX_PROFILE_SKILLS && !selected;

                return (
                  <button
                    key={skill}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${selected ? "Remove" : "Add"} ${skill}`}
                    disabled={limitReached}
                    onClick={() =>
                      selected ? removeSkill(skill) : addSkill(skill)
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-foreground"
                    }`}
                  >
                    {selected && <Check className="h-3.5 w-3.5" />}
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-skill">Can&apos;t find your skill?</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="custom-skill"
                value={customSkill}
                onChange={(event) => setCustomSkill(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSkill(customSkill);
                  }
                }}
                placeholder="Create a skill tag"
                maxLength={MAX_SKILL_NAME_LENGTH}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addSkill(customSkill)}
                disabled={!normalizeSkillName(customSkill)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add skill
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              New tags join the master directory for admin review when you save
              your profile.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Your selected skills</span>
            <span>
              {formData.skills.length}/{MAX_PROFILE_SKILLS}
            </span>
          </div>

          <div className="flex min-h-9 flex-wrap gap-2">
            {formData.skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Remove ${skill}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {formData.skills.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Add skills to help collaborators discover your expertise.
              </p>
            )}
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
