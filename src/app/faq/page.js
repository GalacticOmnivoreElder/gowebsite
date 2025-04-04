import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is Galactic Omnivore?",
    answer:
      "Galactic Omnivore is a premium subscription service providing monthly themed asset packs for game developers. Each pack includes artwork, music, code snippets, and tutorials carefully curated around a specific theme.",
  },
  {
    question: "How often are new asset packs released?",
    answer:
      "We release new themed asset packs monthly. Each pack is carefully curated and includes a variety of assets including artwork, music, code, and tutorials.",
  },
  {
    question: "Can I use the assets in commercial projects?",
    answer:
      "Yes! All assets included in our packs come with a commercial license. You can use them in both personal and commercial projects without additional attribution.",
  },
  {
    question: "How long do I have access to the assets?",
    answer:
      "Once you've unlocked a package, you have lifetime access to those assets. They remain in your library even if you cancel your subscription.",
  },
  {
    question: "What file formats are supported?",
    answer:
      "Our assets come in industry-standard formats: PNG and SVG for artwork, MP3 and WAV for audio, documented source code files, and HD video tutorials.",
  },
  {
    question: "Can I request specific themes for future packs?",
    answer:
      "Absolutely! We encourage community input and regularly consider member suggestions when planning future themed packs.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "We offer a 30-day money-back guarantee on all new subscriptions. If you're not satisfied with our service, contact our support team for a full refund.",
  },
  {
    question: "How can I get support?",
    answer:
      "We offer support through multiple channels: our Discord community, email support, and detailed documentation. Our team typically responds within 24 hours.",
  },
];

export default function FAQPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12">
      <h1 className="text-4xl font-bold text-center mb-8">
        Frequently Asked Questions
      </h1>
      <div className="space-y-4">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
