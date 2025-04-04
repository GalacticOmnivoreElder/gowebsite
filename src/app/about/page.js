import { Card, CardContent } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12">
      <h1 className="text-4xl font-bold text-center mb-8">
        About Galactic Omnivore
      </h1>

      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-muted-foreground">
              At Galactic Omnivore, we&apos;re dedicated to empowering game
              developers with high-quality, themed asset packs that accelerate
              their creative journey. We believe that great games are built on
              great resources, and we&apos;re here to provide them.
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-3">Our Values</h3>
              <ul className="space-y-2">
                <li>🎯 Quality First</li>
                <li>🤝 Community Driven</li>
                <li>🚀 Continuous Innovation</li>
                <li>💡 Creative Freedom</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-3">Our Impact</h3>
              <ul className="space-y-2">
                <li>🎮 1000+ Games Powered</li>
                <li>👥 5000+ Active Developers</li>
                <li>📦 50+ Monthly Packs</li>
                <li>🌍 Global Community</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
            <p className="text-muted-foreground">
              Founded in 2023, Galactic Omnivore emerged from a simple idea:
              make game development more accessible and enjoyable. What started
              as a small collection of assets has grown into a comprehensive
              platform serving developers worldwide.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
