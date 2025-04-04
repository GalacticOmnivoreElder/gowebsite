"use client";

import { observer } from "mobx-react-lite";
import MobxStore from "@/mobx";
import FeaturedPackageCard from "./FeaturedPackageCard";

const FeaturedPackageCardWrapper = observer(({ package: pkg }) => {
  // Check if the package is in the user's unlocked packages
  const isUnlocked = MobxStore.unlockedPackages.includes(pkg.id);

  return <FeaturedPackageCard package={pkg} isUnlocked={isUnlocked} />;
});

export default FeaturedPackageCardWrapper; 