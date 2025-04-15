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
            At Galactic Omnivore, we are building an open, people-first game development community where everyone can grow, contribute, and thrive. We make games together—driven by equality, shared knowledge, and collective values. We believe that game development should be accessible, transparent, and sustainable. Through a peer-reviewed, merit-based system, we support each other’s growth, share our skills, and collaborate on meaningful projects that reflect our diverse strengths. Our platform empowers creators of all levels to take part in educational programs, contribute to real projects, and earn equally for their time and talent. Every contribution is valued, every mistake is a lesson, and every success is shared. We are decentralized. We are cooperative. We are future-focused. We are Galactic Omnivore.            </p>
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
