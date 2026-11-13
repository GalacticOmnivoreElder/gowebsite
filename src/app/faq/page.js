import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "FAQ",
  description:
    "Answers about Galactic Omnivore profiles, projects, membership, learning resources, privacy, and support.",
  path: "/faq",
});

const faqs = [
  {
    question: "What is Galactic Omnivore?",
    answer:
      "Galactic Omnivore (GO) is an independent, nonpartisan, non-profit game-development association and platform based in Skopje and active across North Macedonia. GO helps creators learn practical skills, find collaborators and suitable project roles, publish clear project needs, build visible experience, and move work toward the next playable milestone.",
  },
  {
    question: "What can I do on the platform?",
    answer:
      "You can create a member profile and GameDev Passport, explore learning resources, discover approved projects, apply for suitable roles, or publish a project for admin review. Available features can depend on your account and membership.",
  },
  {
    question: "Who is the platform for?",
    answer:
      "GO is for people learning or working in game development, including artists, designers, programmers, producers, audio creators, writers, testers, mentors, project creators, and small studios. The four practical routes are Learn, Find a Project, Create a Project, and Join the Community.",
  },
  {
    question: "What is a GameDev Passport?",
    answer:
      "Your GameDev Passport is a game-development-focused resume or CV built from the information you provide. You can edit it, control its visibility, publish it, download it, and use it when applying to projects.",
  },
  {
    question: "How are projects published?",
    answer:
      "A project creator submits a draft for review. GO administrators approve or reject public listings. Draft, pending, and rejected projects are not shown in the public project directory.",
  },
  {
    question: "Who can create a project or apply to one?",
    answer:
      "Community members can own one unreleased creator project at a time. Business membership is for business project briefs and team management. Membership and individual project rules determine who can apply. Administrators review project listings before they become public.",
  },
  {
    question: "What happens to my profile when I apply?",
    answer:
      "The application keeps an immutable GameDev Passport snapshot from the time you applied. A project owner may also open your current profile only while your current visibility settings permit it. Later edits do not rewrite the application snapshot.",
  },
  {
    question: "What does membership include?",
    answer:
      "Community provides access to most community and creator features. Mentor is intended for people who want to mentor others, subject to a separate interview and approval. Business is for business project briefs and team management and includes Community benefits. See the Membership page for current features and prices; earnings are not guaranteed.",
  },
  {
    question: "How do renewal, cancellation, and access end work?",
    answer:
      "Your billing page shows the current plan and provider-confirmed status. Recurring plans renew according to their displayed interval until cancelled. Cancellation and access-end timing follow the provider-confirmed effective date. Use the billing portal to manage the subscription or contact support if the status does not match your receipt.",
  },
  {
    question: "Are all announced benefits available now?",
    answer:
      "Your Membership page shows the current benefits for each plan. Access follows the active or paid-through period shown in Billing.",
  },
  {
    question: "Will I always keep access to downloaded resources?",
    answer:
      "Access and licensing can vary by resource. Review the terms shown for the specific package before downloading or using it. Do not assume that every resource has the same license or lifetime-access policy.",
  },
  {
    question: "How does GO use my profile information?",
    answer:
      "You choose the available profile and GameDev Passport visibility settings. Sensitive platform data is handled through authenticated server routes. See the Privacy Policy for details about data use, retention, and your choices.",
  },
  {
    question: "How do I report inappropriate content or behavior?",
    answer:
      "Use the Contact page and include the relevant project, profile, or page URL. GO administrators review moderation and project-status reports. Do not post private evidence publicly.",
  },
  {
    question: "How can I get support?",
    answer:
      "Use the Contact page for account, billing, membership, project, or platform support. Include the page you were using and a short description of what happened, but never send passwords or payment credentials.",
  },
];

export default function FAQPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-3 text-center text-4xl font-bold">
        Frequently Asked Questions
      </h1>
      <p className="mx-auto mb-8 max-w-2xl text-center text-muted-foreground">
        Clear answers about using the Galactic Omnivore platform today.
      </p>
      <section id="changing-membership" className="mb-8 scroll-mt-24 rounded-lg border p-6" aria-labelledby="changing-membership-heading">
        <h2 id="changing-membership-heading" className="text-xl font-semibold">How do I change my membership or billing interval?</h2>
        <p className="mt-3 leading-7">GO supports one membership subscription per account. To change tier or switch between monthly and annual billing:</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 leading-7">
          <li>Open <Link href="/billing" className="text-primary underline">Billing</Link> and use your current provider’s portal to cancel renewal of your existing subscription.</li>
          <li>Check the confirmed end date in the billing portal. You keep access for the remaining paid period, subject to the provider’s terms.</li>
          <li>After that membership expires, sign in to the same GO account and select your new plan on the <Link href="/membership#paid-plans" className="text-primary underline">Membership page</Link>. Your new subscription starts when you complete checkout.</li>
        </ol>
        <p className="mt-3 leading-7">If the status or end date is unclear, <Link href="/contact" className="text-primary underline">contact GO support</Link> before starting another subscription.</p>
      </section>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq) => (
          <AccordionItem key={faq.question} value={faq.question}>
            <AccordionTrigger className="text-left">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="leading-7">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Still need help?{" "}
        <Link
          href="/contact"
          className="font-medium text-primary underline underline-offset-4"
        >
          Contact Galactic Omnivore
        </Link>
        .
      </p>
    </main>
  );
}
