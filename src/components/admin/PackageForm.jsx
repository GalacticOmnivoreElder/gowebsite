"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Music, Image, Code, Video, File, Palette, Gamepad2 } from "lucide-react";

// Helper function to create slugs
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const assetTypes = [
  { value: "music", label: "Music", icon: Music },
  { value: "art", label: "Art", icon: Image },
  { value: "code", label: "Code", icon: Code },
  { value: "video", label: "Video", icon: Video },
  { value: "design", label: "Design", icon: Palette },
  { value: "game", label: "Game", icon: Gamepad2 },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => (currentYear + i).toString());

export default function PackageForm({ initialData, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    id: "",
    slug: "",
    title: "",
    description: "",
    month: months[new Date().getMonth()],
    year: currentYear.toString(),
    theme: "",
    coverImage: "",
    assets: [
      {
        type: "music",
        title: "",
        description: "",
        image: "",
        downloadUrl: "",
      },
    ],
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-generate ID and slug when title changes
      if (name === "title" && !initialData) {
        const newId = slugify(value);
        const newSlug = slugify(value);
        return { ...updated, id: newId, slug: newSlug };
      }

      return updated;
    });
  };

  const handleMonthChange = (value) => {
    setFormData((prev) => ({ ...prev, month: value }));
  };

  const handleYearChange = (value) => {
    setFormData((prev) => ({ ...prev, year: value }));
  };

  const handleAssetChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedAssets = [...prev.assets];
      updatedAssets[index] = { ...updatedAssets[index], [field]: value };
      return { ...prev, assets: updatedAssets };
    });
  };

  const handleAssetTypeChange = (index, value) => {
    handleAssetChange(index, "type", value);
  };

  const addAsset = () => {
    setFormData((prev) => ({
      ...prev,
      assets: [
        ...prev.assets,
        {
          type: "music",
          title: "",
          description: "",
          image: "",
          downloadUrl: "",
        },
      ],
    }));
  };

  const removeAsset = (index) => {
    setFormData((prev) => {
      const updatedAssets = [...prev.assets];
      updatedAssets.splice(index, 1);
      return { ...prev, assets: updatedAssets };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getAssetIcon = (type) => {
    const assetType = assetTypes.find((t) => t.value === type);
    const IconComponent = assetType?.icon || File;
    return <IconComponent className="h-5 w-5" />;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Package Title</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Sakura February 2024"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="month">Month</Label>
              <Select value={formData.month} onValueChange={handleMonthChange}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="year">Year</Label>
              <Select value={formData.year} onValueChange={handleYearChange}>
                <SelectTrigger id="year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="theme">Theme</Label>
            <Input
              id="theme"
              name="theme"
              value={formData.theme}
              onChange={handleChange}
              placeholder="e.g., Japanese Sakura"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe this monthly package..."
              rows={4}
              required
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="id">Package ID</Label>
            <Input
              id="id"
              name="id"
              value={formData.id}
              onChange={handleChange}
              placeholder="e.g., sakura-feb-2024"
              required
              disabled={!!initialData}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Unique identifier for this package. Auto-generated from title.
            </p>
          </div>

          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="e.g., sakura-february-2024"
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              Used in the URL: /packages/[slug]
            </p>
          </div>

          <div>
            <Label htmlFor="coverImage">Cover Image URL</Label>
            <Input
              id="coverImage"
              name="coverImage"
              value={formData.coverImage}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              URL to the main image for this package.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Package Assets</h3>
          <Button type="button" variant="outline" size="sm" onClick={addAsset}>
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>

        <div className="space-y-4">
          {formData.assets.map((asset, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getAssetIcon(asset.type)}
                    <CardTitle className="text-base">
                      Asset {index + 1}
                    </CardTitle>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAsset(index)}
                    disabled={formData.assets.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove asset</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`asset-type-${index}`}>Asset Type</Label>
                    <Select
                      value={asset.type}
                      onValueChange={(value) =>
                        handleAssetTypeChange(index, value)
                      }
                    >
                      <SelectTrigger id={`asset-type-${index}`}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {assetTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor={`asset-title-${index}`}>Title</Label>
                    <Input
                      id={`asset-title-${index}`}
                      value={asset.title}
                      onChange={(e) =>
                        handleAssetChange(index, "title", e.target.value)
                      }
                      placeholder="e.g., Sakura Music Pack"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`asset-description-${index}`}>
                    Description
                  </Label>
                  <Textarea
                    id={`asset-description-${index}`}
                    value={asset.description}
                    onChange={(e) =>
                      handleAssetChange(index, "description", e.target.value)
                    }
                    placeholder="Describe this asset..."
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`asset-image-${index}`}>Image URL</Label>
                    <Input
                      id={`asset-image-${index}`}
                      value={asset.image}
                      onChange={(e) =>
                        handleAssetChange(index, "image", e.target.value)
                      }
                      placeholder="https://example.com/asset-image.jpg"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor={`asset-download-${index}`}>
                      Download URL
                    </Label>
                    <Input
                      id={`asset-download-${index}`}
                      value={asset.downloadUrl}
                      onChange={(e) =>
                        handleAssetChange(index, "downloadUrl", e.target.value)
                      }
                      placeholder="https://drive.google.com/file/d/example"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? "Update Package" : "Create Package"}
        </Button>
      </div>
    </form>
  );
}
