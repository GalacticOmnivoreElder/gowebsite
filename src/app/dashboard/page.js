import { permanentRedirect } from "next/navigation";

export default function DashboardCompatibilityRedirect() {
  permanentRedirect("/profile");
}
