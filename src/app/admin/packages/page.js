"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
  Download,
  Search,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { db, auth } from "@/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { dummyPackages } from "@/data/dummyPackages";
import PackageForm from "@/components/admin/PackageForm";

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdminAndFetchPackages = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.push("/login");
          return;
        }

        // Check if user is admin (this should be done server-side in a real app)
        const idToken = await user.getIdToken();
        const adminCheckResponse = await fetch("/api/admin/check", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!adminCheckResponse.ok) {
          router.push("/");
          return;
        }

        // Fetch packages
        const packagesCollection = collection(db, "packages");
        const packagesSnapshot = await getDocs(packagesCollection);
        const packagesList = packagesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPackages(packagesList);
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: "Failed to load packages. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetchPackages();
  }, [router]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredPackages = packages.filter(
    (pkg) =>
      pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${pkg.month} ${pkg.year}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  const handleSelectPackage = (packageId) => {
    setSelectedPackages((prev) => {
      if (prev.includes(packageId)) {
        return prev.filter((id) => id !== packageId);
      } else {
        return [...prev, packageId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPackages.length === filteredPackages.length) {
      setSelectedPackages([]);
    } else {
      setSelectedPackages(filteredPackages.map((pkg) => pkg.id));
    }
  };

  const handleBulkUpload = async () => {
    setIsUploading(true);
    try {
      const batch = writeBatch(db);

      for (const pkg of dummyPackages) {
        const packageRef = doc(db, "packages", pkg.id);
        batch.set(packageRef, pkg);
      }

      await batch.commit();

      // Refresh the packages list
      const packagesCollection = collection(db, "packages");
      const packagesSnapshot = await getDocs(packagesCollection);
      const packagesList = packagesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPackages(packagesList);

      toast({
        title: "Success",
        description: `${dummyPackages.length} packages uploaded successfully.`,
      });
    } catch (error) {
      console.error("Error uploading packages:", error);
      toast({
        title: "Error",
        description: "Failed to upload packages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPackages.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedPackages.length} packages? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const batch = writeBatch(db);

      for (const packageId of selectedPackages) {
        const packageRef = doc(db, "packages", packageId);
        batch.delete(packageRef);
      }

      await batch.commit();

      // Update local state
      setPackages((prev) =>
        prev.filter((pkg) => !selectedPackages.includes(pkg.id))
      );
      setSelectedPackages([]);

      toast({
        title: "Success",
        description: `${selectedPackages.length} packages deleted successfully.`,
      });
    } catch (error) {
      console.error("Error deleting packages:", error);
      toast({
        title: "Error",
        description: "Failed to delete packages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setIsFormOpen(true);
  };

  const handleDeletePackage = async (packageId) => {
    if (
      !confirm(
        "Are you sure you want to delete this package? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, "packages", packageId));

      // Update local state
      setPackages((prev) => prev.filter((pkg) => pkg.id !== packageId));

      toast({
        title: "Success",
        description: "Package deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting package:", error);
      toast({
        title: "Error",
        description: "Failed to delete package. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreatePackage = () => {
    setEditingPackage(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (packageData) => {
    try {
      const isEditing = !!editingPackage;
      const packageId = isEditing ? editingPackage.id : packageData.id;

      await setDoc(doc(db, "packages", packageId), packageData);

      // Update local state
      if (isEditing) {
        setPackages((prev) =>
          prev.map((pkg) =>
            pkg.id === packageId ? { ...packageData, id: packageId } : pkg
          )
        );
      } else {
        setPackages((prev) => [...prev, { ...packageData, id: packageId }]);
      }

      setIsFormOpen(false);

      toast({
        title: "Success",
        description: `Package ${
          isEditing ? "updated" : "created"
        } successfully.`,
      });
    } catch (error) {
      console.error("Error saving package:", error);
      toast({
        title: "Error",
        description: `Failed to ${
          editingPackage ? "update" : "create"
        } package. Please try again.`,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Package Management</h1>
        <Card>
          <CardContent className="p-6">
            <div className="h-[400px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Package Management</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleBulkUpload}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Bulk Upload"}
          </Button>
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={selectedPackages.length === 0 || isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? "Deleting..." : "Delete Selected"}
          </Button>
          <Button onClick={handleCreatePackage}>
            <Plus className="h-4 w-4 mr-2" />
            New Package
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Packages</CardTitle>
          <CardDescription>
            Manage your monthly themed packages and their assets.
          </CardDescription>
          <div className="flex items-center mt-2">
            <Search className="h-4 w-4 mr-2 text-muted-foreground" />
            <Input
              placeholder="Search packages..."
              value={searchQuery}
              onChange={handleSearch}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">
                No packages found. Upload some packages to get started.
              </p>
              <Button onClick={handleBulkUpload} disabled={isUploading}>
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload Sample Packages"}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedPackages.length === filteredPackages.length &&
                          filteredPackages.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all packages"
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Month/Year</TableHead>
                    <TableHead>Theme</TableHead>
                    <TableHead>Assets</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPackages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPackages.includes(pkg.id)}
                          onCheckedChange={() => handleSelectPackage(pkg.id)}
                          aria-label={`Select ${pkg.title}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{pkg.title}</TableCell>
                      <TableCell>
                        {pkg.month} {pkg.year}
                      </TableCell>
                      <TableCell>{pkg.theme}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {pkg.assets?.length || 0} assets
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleEditPackage(pkg)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeletePackage(pkg.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? "Edit Package" : "Create New Package"}
            </DialogTitle>
            <DialogDescription>
              {editingPackage
                ? "Update the details of this package and its assets."
                : "Fill in the details to create a new monthly package."}
            </DialogDescription>
          </DialogHeader>

          <PackageForm
            initialData={editingPackage}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
