import { FullCTA } from "@/components/landing/FullCTA";
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
              At Galactic Omnivore, we’re building a creative ecosystem that
              empowers individuals and communities through the power of games,
              technology, and storytelling. We are an open, people-first game
              development community where everyone can grow, contribute, and
              thrive.
              <br />
              <br />
              We make games together — driven by equality, shared knowledge, and
              collective values. Our mission is rooted in innovation, education,
              and collaboration, creating a space where game development is
              accessible, transparent, and sustainable for all.
              <br />
              <br />
              We are decentralized. We are cooperative. We are future-focused.
              Every contribution is valued. Every mistake is a lesson. Every
              success is shared. We are Galactic Omnivore.
            </p>
            <p className="text-muted-foreground mt-6">
              <strong>Our main objectives are:</strong>
              <br />
              <br />
              1. Build an open multimedia platform to support the development of
              games in all forms — digital, physical, or hybrid — through
              accessible, open-source tools and resources.
              <br />
              <br />
              2. Empower creators with practical skills in the game development
              industry through shared learning, hands-on projects, and
              collective portfolio building, using both formal and informal
              education methods.
              <br />
              <br />
              3. Support local initiatives and foster a thriving network for
              game creation, publishing, and knowledge-sharing — strengthening
              collaboration and communication within the local creative
              community.
              <br />
              <br />
              🚀 Ready to dive deeper into our vision?
              <br />
              <a
                href="https://drive.google.com/file/d/1DRFhgeRC7GwwnC5u2W1IJOBc8SgOSxIm/view?usp=sharing"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                👉 Read our full Statute here
              </a>{" "}
              and see how you can be part of the movement.
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
                  🎓{" "}
                  <a
                    href="https://itch.io/jam/gogamejam2024"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Empowering The Next Generation of Game Developers
                  </a>{" "}
                  – Game education & community jam initiative
                </li>
                <li>
                  🏛️{" "}
                  <a
                    href="http://mugi.mk/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Macedonian Union of Gaming Industry
                  </a>{" "}
                  – National industry support platform
                </li>
                <li>
                  🧭{" "}
                  <a
                    href="https://kikerkov.itch.io/navigator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Navigator
                  </a>{" "}
                  – Educational game with 50,000+ plays for Human Rights Day
                </li>
                <li>
                  🕯️{" "}
                  <a
                    href="https://www.instagram.com/glagolitic_2.0/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    GLAGOLICA – VR
                  </a>{" "}
                  – Immersive cultural heritage experience
                </li>
                <li>
                  🤝 Partnerships:
                  <a
                    href="https://linktr.ee/PrintNplay"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline ml-1"
                  >
                    PRINT N’ PLAY
                  </a>{" "}
                  (TTRPGs),
                  <a
                    href="https://linktr.ee/zandana"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline ml-1"
                  >
                    ZANDANA
                  </a>{" "}
                  (D&D community support)
                </li>
                <li>
                  🌌 <span className="font-semibold">Galactic Omnivore</span> –
                  Internal growth through game dev, education & innovation
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
            <p className="text-muted-foreground">
              Founded in 2023, Galactic Omnivore emerged from a shared belief in
              creative collaboration and accessibility. From a small grassroots
              initiative to an expansive platform with global reach, we continue
              to evolve—bridging knowledge gaps and empowering the next
              generation of game developers.
            </p>
          </CardContent>
        </Card>
        <FullCTA />
      </div>
    </div>
  );
}
