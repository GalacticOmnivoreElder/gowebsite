import { createMetadata } from "@/lib/seo";
import MerchPage from "@/components/merch/MerchPage";

export const metadata = createMetadata({
  title: "GO Merch",
  description: "Join the GO merch waitlist. Request T-shirts, hoodies, tote bags and stickers, or suggest something new. Starting in Skopje.",
  path: "/merch",
});

export default function Page() {
  return <MerchPage />;
}
