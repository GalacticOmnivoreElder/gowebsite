import Link from 'next/link';
import { Button } from '@/components/ui/button';
export const metadata = { title: 'GO Support' };
export default function SupportPage() {
  return <main className="mx-auto max-w-3xl px-5 py-14"><h1 className="text-4xl font-bold">How can GO help?</h1><p className="my-6 text-lg text-muted-foreground">Contact GO about your account, membership, a project or publishing support. You can request help even when your membership has ended.</p><Button asChild><Link href="/contact">Contact the GO team</Link></Button></main>;
}
