import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Contact",
  description:
    "Contact Galactic Omnivore for account support, project questions, or organization inquiries.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12">
      <h1 className="text-4xl font-bold text-center mb-8">Contact GO</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Use the support desk for account, billing, resource, or platform
              questions.
            </p>
            <a
              href="https://galacticomnivore.atlassian.net/servicedesk/customer/portal/"
              className="font-medium text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Support Omnidesk
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organization inquiries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Use this address for organization and project-owner inquiries.
            </p>
            <p className="font-medium">business@galacticomnivore.com</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visit GOHQ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">GOHQ</h3>
              <p className="text-muted-foreground">
                Blvd. Partizanski Odredi 6/43, Skopje 1000
                <br />
                Center
                <br />
                Skopje, 1000
                <br />
                Macedonia
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Working hours</h3>
              <p className="text-muted-foreground">
                Monday - Friday
                <br />
                12:00 - 20:00 (CEST)
                <br />
                <br />
                Support available during working hours
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
