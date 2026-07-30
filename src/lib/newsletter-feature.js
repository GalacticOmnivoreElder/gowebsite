export function isNewsletterEnabled() {
  return process.env.NEWSLETTER_ENABLED !== "false";
}

export function newsletterUnavailableResponse() {
  return Response.json(
    {
      error:
        "The Galactic Omnivore newsletter is not accepting subscriptions yet.",
    },
    {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
