import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function MakeAdminLayout({ children }) {
  return children;
}
