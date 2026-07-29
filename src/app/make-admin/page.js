import { notFound } from "next/navigation";
import MakeAdminClient from "./MakeAdminClient";

export default function MakeAdminPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <MakeAdminClient />;
}
