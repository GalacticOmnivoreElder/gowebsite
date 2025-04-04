import { adminDb } from "@/lib/firebase-admin";
import PackageList from "@/components/packages/PackageList";
import FeaturedPackageCardWrapper from "@/components/packages/FeaturedPackageCardWrapper";

// This enables Static Site Generation
export const revalidate = 3600; // Revalidate every hour

async function getPackages() {
  const packagesSnapshot = await adminDb.collection("packages").get();

  return packagesSnapshot.docs.map((doc) => {
    const data = doc.data();
    const assets =
      data.assets?.map((asset) => ({
        title: asset.title,
        description: asset.description,
        type: asset.type,
        image: asset.image,
      })) || [];

    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      theme: data.theme,
      month: data.month,
      year: data.year,
      coverImage: data.coverImage,
      slug: data.slug,
      assets,
    };
  });
}

// Server component
export default async function PackagesPage() {
  const packages = await getPackages();
  
  // Sort packages by date to find the latest one
  const sortedPackages = [...packages].sort((a, b) => {
    const dateA = new Date(`${a.month} 1, ${a.year}`);
    const dateB = new Date(`${b.month} 1, ${b.year}`);
    return dateB - dateA;
  });

  const latestPackage = sortedPackages[0];
  // const pastPackages = sortedPackages.slice(1);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Monthly Game Asset Packages</h1>

      {latestPackage && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            Featured: Package for this Month!
          </h2>
          <FeaturedPackageCardWrapper package={latestPackage} />
        </div>
      )}

      {/* <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">Past Months Packages</h2>
        <PackageList packages={pastPackages} />
      </div> */}
    </div>
  );
}
