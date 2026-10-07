import MerchAction from "@/components/merch/MerchAction";
export const metadata = { title: "Confirm merch request", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function Page() { return <MerchAction action="confirm" />; }
