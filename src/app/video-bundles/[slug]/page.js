import { VideoBundleDetail } from "@/components/video-bundles/VideoBundleDetail";

export default async function VideoBundlePage({ params }) {
  const { slug } = await params;
  return <VideoBundleDetail slug={slug} />;
}
