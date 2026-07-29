import CvWorkspace from "@/components/profile/CvWorkspace";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "GameDev Passport | Galactic Omnivore",
  description:
    "Build, publish, download, and use your reusable game-development resume/CV when applying to projects.",
  path: "/profile/cv",
  noIndex: true,
});

export default function ProfileCvPage() {
  return <CvWorkspace />;
}
