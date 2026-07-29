import { notFound } from "next/navigation";
import TestPolarClient from "./TestPolarClient";

export default function TestPolarPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <TestPolarClient />;
}
