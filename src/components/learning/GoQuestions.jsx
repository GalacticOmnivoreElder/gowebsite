'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { goFetch } from '@/lib/go-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function GoQuestions({ query = '', staff = false }) {
  const [question, setQuestion] = useState('');
  const [consent, setConsent] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviews, setReviews] = useState({});
  const search = question || query;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try { const result = await goFetch(staff ? '/api/learning-questions?review=true' : `/api/learning-questions?q=${encodeURIComponent(search)}`); if (!controller.signal.aborted) { setData(result); setError(''); } }
      catch (e) { if (!controller.signal.aborted) setError(e.message); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, staff, message]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await goFetch('/api/learning-questions', { question, publishConsent: consent }); setMessage(`${result.message} Receipt: ${result.id}`); setQuestion(''); setConsent(false); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function review(id, status) {
    setBusy(true); setError('');
    const original = data.questions.find(item => item.id === id);
    try { await goFetch('/api/learning-questions', { action: 'review', id, status, answer: original.answer || '', publicQuestion: original.publicQuestion || original.question, ...reviews[id] }); setMessage(`Saved ${id}: ${status} at ${new Date().toLocaleTimeString()}`); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section id="go-questions" className="mx-auto my-8 max-w-5xl space-y-5 rounded-2xl border border-primary/30 bg-background p-5 text-foreground sm:p-8" aria-labelledby="go-questions-title">
    <h2 id="go-questions-title" className="text-2xl font-bold">{staff ? 'GO question review' : 'Ask GO. Learn together.'}</h2>
    {!staff && <><p className="text-muted-foreground">Search existing answers or send a learning question. We create learning materials daily and aim to respond as soon as we can. For personal, ongoing guidance, <Link className="text-primary underline" href="/mentorship">request member mentorship</Link>.</p><form onSubmit={submit} className="space-y-4"><label className="block font-medium" htmlFor="go-question">What would you like to learn?</label><Textarea id="go-question" value={question} onChange={e => setQuestion(e.target.value)} minLength={12} maxLength={2000} required placeholder="Tell us what you are trying to make and where you are stuck." /><label className="flex items-start gap-3 text-sm"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" /><span>GO may edit and publish my question and answer for the community. I will leave out private information. Visitors are shown as Anonymous; signed-in authors as GO member.</span></label><Button disabled={busy}>{busy ? 'Sending…' : 'Send question to GO'}</Button></form></>}
    {error && <p role="alert" className="text-destructive">{error}</p>}{message && <p role="status">{message}</p>}
    {!staff && data?.answers?.length > 0 && <div><h3 className="mb-3 font-semibold">{search ? 'Related GO answers' : 'From the GO learning FAQ'}</h3>{data.answers.map(item => { const answer = String(item.answer || ''); return <article key={item.id} className="border-t py-4"><Link className="font-semibold text-primary underline" href={item.href}>{item.question}</Link><p className="mt-2 whitespace-pre-wrap text-sm">{answer.slice(0, 350)}{answer.length > 350 ? '…' : ''}</p></article>})}</div>}
    {staff && data?.questions?.map(item => <article key={item.id} className="space-y-3 rounded-xl border p-4"><p className="text-sm text-muted-foreground">{item.status} · {item.publicAttribution}</p><p className="font-semibold">{item.question}</p><label className="block">Public question<Textarea value={reviews[item.id]?.publicQuestion ?? item.publicQuestion ?? item.question} onChange={e => setReviews({ ...reviews, [item.id]: { ...reviews[item.id], publicQuestion: e.target.value } })} /></label><label className="block">Answer<Textarea rows={6} value={reviews[item.id]?.answer ?? item.answer ?? ''} onChange={e => setReviews({ ...reviews, [item.id]: { ...reviews[item.id], answer: e.target.value } })} /></label><div className="flex gap-3"><Button disabled={busy} onClick={() => review(item.id, 'published')}>Publish answer and notify</Button><Button variant="outline" disabled={busy} onClick={() => review(item.id, 'pending')}>Save / unpublish</Button><Button variant="ghost" disabled={busy} onClick={() => review(item.id, 'closed')}>Close</Button></div></article>)}
  </section>;
}
