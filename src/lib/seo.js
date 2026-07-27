import he from "he";

export const SITE_NAME = "Galactic Omnivore";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.galacticomnivore.com"
).replace(/\/$/, "");
export const DEFAULT_DESCRIPTION =
  "Galactic Omnivore is Macedonia's game development community for learning, collaboration, portfolio building, and finding a game dev team.";
export const DEFAULT_OG_IMAGE = "/opengraph-image";
export const DEFAULT_KEYWORDS = [
  "Galactic Omnivore",
  "Macedonia game development",
  "Skopje game development",
  "game dev community",
  "game development education",
  "indie game development",
  "game development projects",
  "game developer portfolio",
  "game jam Macedonia",
];

export const sameAs = [
  "https://www.facebook.com/profile.php?id=100088917386120",
  "https://www.instagram.com/galacticomnivore/",
  "https://www.linkedin.com/company/galactic-omnivore/",
  "https://www.youtube.com/@galacticomnivore",
  "https://www.twitch.tv/galactic_omnivore",
  "https://discord.gg/ZbSShxu6K4",
];

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function stripHtml(value = "") {
  return he
    .decode(String(value).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(value = "", maxLength = 155) {
  const text = stripHtml(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

export function createMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  type = "website",
  publishedTime,
  modifiedTime,
  authors = [SITE_NAME],
  tags,
  noIndex = false,
} = {}) {
  const metaTitle = title || SITE_NAME;
  const metaDescription = truncate(description, 160) || DEFAULT_DESCRIPTION;
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  return {
    title: metaTitle,
    description: metaDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url,
      siteName: SITE_NAME,
      type,
      locale: "en_US",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} game development community`,
        },
      ],
      ...(type === "article"
        ? {
            publishedTime,
            modifiedTime,
            authors,
            tags,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: [imageUrl],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : undefined,
  };
}

export const noIndexMetadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const organizationJsonLd = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl("/galactic-omnivore-skull-v1-512.png"),
  description: DEFAULT_DESCRIPTION,
  email: "galacticomnivore@galacticomnivore.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Blvd. Partizanski Odredi 6/43",
    addressLocality: "Skopje",
    postalCode: "1000",
    addressCountry: "MK",
  },
  sameAs,
};

export const websiteJsonLd = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  publisher: {
    "@id": `${SITE_URL}/#organization`,
  },
  inLanguage: "en",
};

export const seoJsonLd = {
  "@context": "https://schema.org",
  "@graph": [organizationJsonLd, websiteJsonLd],
};

export async function getWordPressPostBySlug(slug) {
  if (!slug || !process.env.WORDPRESS_API_URL) return null;

  try {
    const response = await fetch(
      `${process.env.WORDPRESS_API_URL}/posts?_embed&slug=${encodeURIComponent(
        slug
      )}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) return null;

    const [post] = await response.json();
    if (!post) return null;

    const categories =
      post._embedded?.["wp:term"]?.[0]?.map((term) => term.name) || [];

    return {
      title: stripHtml(post.title?.rendered || "Galactic Omnivore Blog"),
      slug: post.slug,
      excerpt: truncate(post.excerpt?.rendered || post.content?.rendered),
      date: post.date_gmt || post.date,
      modified: post.modified_gmt || post.modified,
      thumbnail: post.jetpack_featured_media_url || DEFAULT_OG_IMAGE,
      categories,
    };
  } catch (error) {
    console.error("Failed to load WordPress SEO metadata:", error);
    return null;
  }
}

export async function getWordPressPostsForSitemap() {
  if (!process.env.WORDPRESS_API_URL) return [];

  try {
    const response = await fetch(
      `${process.env.WORDPRESS_API_URL}/posts?per_page=100&_fields=slug,modified_gmt,date_gmt`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) return [];

    return await response.json();
  } catch (error) {
    console.error("Failed to load WordPress sitemap entries:", error);
    return [];
  }
}
