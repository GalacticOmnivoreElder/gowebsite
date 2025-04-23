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
              At Galactic Omnivore, we’re building a people-first game dev community where everyone can grow, create, and thrive.
              <br /><br />
              We make games together — driven by equality, shared knowledge, and real collaboration.
              <br /><br />
              <strong>Our mission?</strong><br />
              Empower devs of all levels through open tools, hands-on learning, and fair rewards.<br />
              Build games. Learn by doing. Share success.
              <br /><br />
              <strong>Unite. Create. Evolve.</strong><br />
              We’re decentralized. We’re cooperative. We’re future-focused.<br />
              <strong>We are Galactic Omnivore.</strong>
            </p>
            <p className="text-muted-foreground mt-6">
              Our goals also include: building a multimedia platform with open-source tools to support all types of game development; helping members gain practical skills and build portfolios through collaborative projects and education; and supporting local initiatives that connect game creation, learning, and community development.
              <br /><br />
              <a
                href="https://drive.google.com/file/d/1dRk9BEbZEDK1968WUrj6oZv_kYrEq4in/view?usp=sharing"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read our full Statute here →
              </a> to learn more about our vision and how you can be part of it.
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-3">Our Values</h3>
              <ul className="space-y-2">
                <li>🤝 Honesty</li>
                <li>🔁 Evolution</li>
                <li>📚 Knowledge</li>
                <li>✅ Accountability</li>
                <li>🔥 Commitment</li>
                <li>⚖️ Egalitarianism</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-3">Our Impact</h3>
              <ul className="space-y-2">
                <li>
                  🎓 <a href="https://itch.io/jam/gogamejam2024" target="_blank" rel="noopener noreferrer" className="underline">Empowering The Next Generation of Game Developers</a> – Game education & community jam initiative
                </li>
                <li>
                  🏛️ <a href="http://mugi.mk/" target="_blank" rel="noopener noreferrer" className="underline">Macedonian Union of Gaming Industry</a> – National industry support platform
                </li>
                <li>
                  🧭 <a href="https://kikerkov.itch.io/navigator" target="_blank" rel="noopener noreferrer" className="underline">Navigator</a> – Educational game with 50,000+ plays for Human Rights Day
                </li>
                <li>
                  🕯️ <a href="https://www.instagram.com/glagolitic_2.0/" target="_blank" rel="noopener noreferrer" className="underline">GLAGOLICA – VR</a> – Immersive cultural heritage experience
                </li>
                <li>
                  🤝 Partnerships: 
                  <a href="https://linktr.ee/PrintNplay" target="_blank" rel="noopener noreferrer" className="underline ml-1">PRINT N’ PLAY</a> (TTRPGs), 
                  <a href="https://linktr.ee/zandana" target="_blank" rel="noopener noreferrer" className="underline ml-1">ZANDANA</a> (D&D community support)
                </li>
                <li>
                  🌌 <span className="font-semibold">Galactic Omnivore</span> – Internal growth through game dev, education & innovation
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
            <p className="text-muted-foreground">
              Founded in 2023, Galactic Omnivore emerged from a shared belief in creative collaboration and accessibility. From a small grassroots initiative to an expansive platform with global reach, we continue to evolve—bridging knowledge gaps and empowering the next generation of game developers.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
