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
      "Galactic Omnivore is a game development community and registered NGO dedicated to empowering game development enthusiasts. Our mission is to support individuals in: Learning game development through mentorships, workshops, and practical modules Building a professional portfolio by working on real projects and collaborative games Outsourcing their skills to the international game development ecosystem We serve as a launchpad for creative and technical talent—helping members grow from curious learners to confident creators with global opportunities.",
  },
  {
    question: "How often are new asset packs released?",
    answer:
      "We release new themed asset packs monthly. Each pack is carefully curated and includes a variety of assets including artwork, music, code, and tutorials.",
  },
  {
    question: "Can I use the assets in commercial projects?",
    answer:
      "Yes, you can use the assets in both personal and commercial projects. However, they are licensed under the Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0). This means: Attribution is required – You must give appropriate credit, provide a link to the license, and indicate if changes were made. ShareAlike – If you remix, transform, or build upon the material, you must distribute your contributions under the same license. Be sure to follow the license terms when using these assets.",
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
  // {
  //   question: "Do you offer refunds?",
  //   answer:
  //     "We offer a 30-day money-back guarantee on all new subscriptions. If you're not satisfied with our service, contact our support team for a full refund.",
  // },
  {
    question: "How can I get support?",
    answer:
      "We offer support through our support service desk Galactic Omnidesk available on the following URL: https://galacticomnivore.atlassian.net/servicedesk/customer/portals ",
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
