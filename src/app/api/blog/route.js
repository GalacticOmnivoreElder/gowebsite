import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function blogApiUrl(path) {
  const base = String(process.env.WORDPRESS_API_URL || "").replace(/\/$/, "");
  return base ? `${base}${path}` : null;
}

async function getBlogCategoryId() {
  const url = blogApiUrl("/categories?slug=blog&_fields=id");
  if (!url) return null;
  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) return null;
  const categories = await response.json();
  return Array.isArray(categories) ? categories[0]?.id || null : null;
}

function formatBlogPost(post) {
  const terms = post?._embedded?.["wp:term"] || [];
  const categories = terms
    .flat()
    .filter((term) => term?.taxonomy === "category")
    .map((term) => term.name)
    .filter(Boolean);
  return {
    id: post.id,
    title: post.title?.rendered || "Untitled",
    slug: post.slug,
    content: post.content?.rendered || "",
    excerpt: post.excerpt?.rendered || "",
    date: post.date ? new Date(post.date).toLocaleDateString() : "No date",
    categories: categories.length ? categories : ["GO Signal"],
    thumbnail: post.jetpack_featured_media_url || "/default-thumbnail.jpg",
  };
}

export async function GET(request) {
  if (!process.env.WORDPRESS_API_URL) {
    const slug = new URL(request.url).searchParams.get("slug");
    return NextResponse.json(slug ? null : []);
  }

  try {
    const slug = new URL(request.url).searchParams.get("slug");
    const categoryId = await getBlogCategoryId();
    if (!categoryId) return NextResponse.json(slug ? null : []);

    const params = new URLSearchParams({
      _embed: "1",
      categories: String(categoryId),
      per_page: slug ? "1" : "100",
    });
    if (slug) params.set("slug", slug);

    const response = await fetch(blogApiUrl(`/posts?${params}`), {
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      throw new Error(`WordPress responded with ${response.status}`);
    }
    const posts = await response.json();
    const formatted = Array.isArray(posts) ? posts.map(formatBlogPost) : [];
    return NextResponse.json(slug ? formatted[0] || null : formatted);
  } catch (error) {
    console.error("Blog content could not be loaded", {
      code: error?.code || error?.name || "unknown",
    });
    return NextResponse.json(
      { error: "GO Signal could not be loaded" },
      { status: 503 },
    );
  }
}
