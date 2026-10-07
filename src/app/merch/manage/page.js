import MerchAction from "@/components/merch/MerchAction";
export const metadata = { title: "Manage merch request", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Page() { return <MerchAction action="withdraw" />; }
