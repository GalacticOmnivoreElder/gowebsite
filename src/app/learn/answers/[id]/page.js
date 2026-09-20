import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebase-admin';
export const dynamic = 'force-dynamic';
export default async function Page({ params }) {
  const { id } = await params;
  const doc = await adminDb.collection('learning_questions').doc(id).get();
  if (!doc.exists || doc.data().status !== 'published') notFound();
  const answer = doc.data();
  return <main className="mx-auto max-w-3xl px-5 py-14"><Link className="text-primary underline" href="/learn#go-questions">← GO learning answers</Link><p className="mt-8 text-sm text-muted-foreground">Asked by {answer.publicAttribution || 'Anonymous'}</p><h1 className="my-5 text-3xl font-bold">{answer.publicQuestion}</h1><div className="whitespace-pre-wrap text-lg leading-8">{answer.answer}</div><p className="mt-8 text-sm text-muted-foreground">Reviewed and published by GO.</p></main>;
}
