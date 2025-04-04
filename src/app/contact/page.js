import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContactPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12">
      <h1 className="text-4xl font-bold text-center mb-8">Contact Us</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Need help with your subscription, assets or game development journey in general?
            </p>
            <a
              href="https://galacticomnivore.atlassian.net/servicedesk/customer/portal/"
              className="font-medium text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://galacticomnivore.atlassian.net/servicedesk/customer/portal/
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Inquiries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Interested in partnerships or collaboration?
            </p>
            <p className="font-medium">galacticomnivore@galacticomnivore.com</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visit Us</CardTitle>
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
              <h3 className="font-semibold mb-2">Working Hours</h3>
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
