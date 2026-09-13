import Omnivore from "@/components/omnivore/Omnivore";
import "@/components/omnivore/single-lab.css";

export const metadata = {
  title: "GO Game Development Lab",
  description: "Ask the Galactic Omnivore to find your next game-development learning step.",
  alternates: { canonical: "/learn" },
};

export default function LearnPage() {
  return <Omnivore />;
}
