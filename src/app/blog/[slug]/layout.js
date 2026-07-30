import { createMetadata, getWordPressPostBySlug } from "@/lib/seo";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getWordPressPostBySlug(slug);

  if (!post) {
    return createMetadata({
      title: "GO Signal post",
      description:
        "Read a post from Galactic Omnivore's GO Signal.",
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }

  return createMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    image: post.thumbnail,
    type: "article",
    publishedTime: post.date,
    modifiedTime: post.modified,
    tags: post.categories,
  });
}

export default function BlogPostLayout({ children }) {
  return children;
}
