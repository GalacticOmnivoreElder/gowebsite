"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bug, CheckCircle2, Paperclip, Sparkles } from "lucide-react";
import "./bugs.css";

const portal = "https://galacticomnivore.atlassian.net/servicedesk/customer/portal/5/group/14/create/10220";
const prompts = [
  { name: "email", label: "Where can we reach you?", hint: "Share an email address so the GO team can follow up.", type: "email", placeholder: "you@example.com" },
  { name: "summary", label: "Give this bug a name", hint: "A short summary helps us find the problem faster.", type: "text", placeholder: "For example: My profile won't save" },
  { name: "description", label: "What happened?", hint: "Tell us what you were doing, what you expected, and what happened instead.", type: "textarea", placeholder: "The more detail, the better…" },
];

export default function BugReporter() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ email: "", summary: "", description: "" });
  const [file, setFile] = useState(null);
  const [available, setAvailable] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/bugs", { signal: controller.signal, cache: "no-store" }).then((response) => response.json()).then((data) => setAvailable(Boolean(data.available))).catch(() => { if (!controller.signal.aborted) setAvailable(false); });
    return () => controller.abort();
  }, []);

  const next = (event) => { event.preventDefault(); setError(""); setStep((value) => Math.min(value + 1, 3)); };
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    const form = new FormData();
    Object.entries(answers).forEach(([name, value]) => form.set(name, value));
    if (file) form.set("attachment", file);
    try {
      let response;
      try { response = await fetch("/api/bugs", { method: "POST", body: form }); }
      catch { throw new Error("We couldn't confirm whether the report was sent. Please contact GO support before trying again."); }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We couldn't submit your report.");
      setResult(data);
    } catch (issue) { setError(issue.message || "We couldn't confirm whether the report was sent. Please contact GO support before trying again."); }
    finally { setBusy(false); }
  };

  const prompt = prompts[step];
  return <main className="bug-page" data-clarity-mask="true">
    <div className="bug-wrap">
      <div className="bug-intro">
        <span className="bug-kicker"><Sparkles size={15} /> GO BUG HUNTERS</span>
        <h1>Spotted a bug?<br /><span>Let&apos;s catch it.</span></h1>
        <p>Something not quite right in the GO universe? Tell us what happened and we&apos;ll send it to the team.</p>
        <div className="bug-character"><Image src="/go-avatar.png" alt="" fill sizes="(max-width: 800px) 70vw, 420px" priority /></div>
      </div>
      <section className="bug-card" aria-label="Bug report">
        {result ? <div className="bug-success" role="status"><CheckCircle2 size={36} /><p className="bug-kicker">REPORT RECEIVED</p><h2>Nice catch!</h2><p>Your report is with the GO team. Your reference is <strong>{result.reference}</strong>.</p>{result.attachmentFailed && <p>Your report was created, but we couldn&apos;t attach the file. Please contact GO support with your reference to share it.</p>}<a href={portal}>Open the support portal <ArrowRight size={16} /></a></div> : <>
          <div className="bug-progress"><span><Bug size={16} /> BUG REPORT</span><span>STEP {step + 1} / 4</span></div>
          <div className="bug-track" aria-hidden="true"><span style={{ width: `${(step + 1) * 25}%` }} /></div>
          {step < 3 ? <form onSubmit={next} className="bug-form" key={step}>
            <label htmlFor={prompt.name}><h2>{prompt.label}</h2><span>{prompt.hint}</span></label>
            {prompt.type === "textarea" ? <textarea id={prompt.name} value={answers[prompt.name]} onChange={(event) => setAnswers({ ...answers, [prompt.name]: event.target.value })} placeholder={prompt.placeholder} minLength={10} maxLength={8000} required autoFocus /> : <input id={prompt.name} type={prompt.type} value={answers[prompt.name]} onChange={(event) => setAnswers({ ...answers, [prompt.name]: event.target.value })} placeholder={prompt.placeholder} minLength={prompt.name === "summary" ? 5 : undefined} maxLength={prompt.name === "email" ? 254 : 160} required autoFocus />}
            {prompt.name === "email" && <p className="bug-note">Your email is included with the report for follow-up. It is not verified, and this form does not automatically send a confirmation email.</p>}
            <div className="bug-actions">{step > 0 && <button type="button" className="bug-back" onClick={() => setStep(step - 1)}><ArrowLeft size={17} /> Back</button>}<button className="bug-next" type="submit">Continue <ArrowRight size={17} /></button></div>
          </form> : <form onSubmit={submit} className="bug-form">
            <h2>Anything to show us?</h2><p>Add an optional screenshot or file, then review your report.</p>
            <label className="bug-upload"><Paperclip size={20} /><span>{file ? file.name : "Choose a file"}<small>One file, up to 3 MB</small></span><input type="file" onChange={(event) => { const chosen = event.target.files?.[0]; if (chosen?.size > 3 * 1024 * 1024) { setError("Please choose a file up to 3 MB."); event.target.value = ""; setFile(null); } else { setError(""); setFile(chosen || null); } }} /></label>
            <div className="bug-review"><div><strong>Email</strong><span>{answers.email}</span></div><div><strong>Summary</strong><span>{answers.summary}</span></div><div><strong>Details</strong><span>{answers.description}</span></div></div>
            <p className="bug-note">Your report and any attachment will be shared with the GO support team through Jira. Please leave out passwords and other sensitive information.</p>
            {available === false && <p className="bug-error">The GO form isn&apos;t connected yet. You can <a href={portal}>report this directly in the support portal</a>.</p>}
            {error && <p className="bug-error" role="alert">{error} <a href={portal}>Open support portal</a></p>}
            <div className="bug-actions"><button type="button" className="bug-back" onClick={() => setStep(2)} disabled={busy}><ArrowLeft size={17} /> Back</button><button className="bug-next" type="submit" disabled={busy || available !== true}>{busy ? "Sending…" : "Send report"} <ArrowRight size={17} /></button></div>
          </form>}
        </>}
      </section>
      <p className="bug-footer">Prefer the classic route? <a href={portal}>Visit the support portal</a></p>
    </div>
  </main>;
}
