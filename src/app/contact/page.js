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
              Need help with your subscription or assets?
            </p>
            <p className="font-medium">support@galacticomnivore.com</p>
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
            <p className="font-medium">business@galacticomnivore.com</p>
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
              <h3 className="font-semibold mb-2">Main Office</h3>
              <p className="text-muted-foreground">
                123 Game Dev Street
                <br />
                Digital District
                <br />
                San Francisco, CA 94105
                <br />
                United States
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Working Hours</h3>
              <p className="text-muted-foreground">
                Monday - Friday
                <br />
                9:00 AM - 6:00 PM (PST)
                <br />
                <br />
                Support available 24/7
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
