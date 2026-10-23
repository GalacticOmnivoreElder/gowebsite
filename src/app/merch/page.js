import { createMetadata } from "@/lib/seo";
import MerchPage from "@/components/merch/MerchPage";

export const metadata = createMetadata({
  title: "GO Merch",
  description: "Reserve the first GO T-shirt collection. Choose a design, size and fit, then select Skopje pickup or delivery.",
  path: "/merch",
});

export default function Page() {
  return <MerchPage />;
}
