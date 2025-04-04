import PackageCard from "./PackageCard";

export default function PackageList({ packages }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {packages.map((pkg) => (
        <PackageCard key={pkg.id} package={pkg} />
      ))}
    </div>
  );
}
