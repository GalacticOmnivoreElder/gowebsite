"use client";

import Image from "next/image";
import Link from "next/link";
import { auth } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, HelpCircle, Compass, Gamepad2, GraduationCap, Lightbulb, Link2, MessageCircle, Network, Search, X, Pause, Play, Sparkles, Trophy, Users, Zap, } from "lucide-react";
const GO_ORIGIN = "https://www.galacticomnivore.com";
const ROUTES = {
    orientation: {
        key: "orientation",
        kind: "course",
        label: "Start here",
        title: "Orientation & Diagnostic",
        description: "Find your starting point, name a next milestone, and get a route without choosing a permanent role.",
        href: `${GO_ORIGIN}/blog/start-your-game-dev-pathway-orientation-diagnostic-course`,
        tags: ["starting", "pathway", "self-direction"],
        icon: Compass,
        accent: "lime",
    },
    foundations: {
        key: "foundations",
        kind: "course",
        label: "Course",
        title: "Foundations of Game Design",
        description: "Turn a loose idea into a playable promise by looking at players, choices, rules, and scope.",
        href: `${GO_ORIGIN}/blog/foundations-of-game-design-build-better-game-ideas`,
        tags: ["design", "scope", "player-experience"],
        icon: Lightbulb,
        accent: "violet",
    },
    microgame: {
        key: "microgame",
        kind: "course",
        label: "Build",
        title: "Build Your First Microgame",
        description: "Make a tiny playable thing from idea to prototype, then learn from someone touching it.",
        href: `${GO_ORIGIN}/blog/build-your-first-microgame-from-idea-to-playable-prototype`,
        tags: ["prototype", "build", "playtest"],
        icon: Gamepad2,
        accent: "orange",
    },
    steam: {
        key: "steam",
        kind: "workshop",
        label: "Workshop",
        title: "Publish Your Game on Steam",
        description: "A practical route through the store page, build delivery, preparation, and the work around release.",
        href: `${GO_ORIGIN}/blog/publish-your-game-on-steam-practical-workshop-for-indie-developers-2`,
        tags: ["publish", "steam", "release"],
        icon: ArrowUpRight,
        accent: "blue",
    },
    kickstarter: {
        key: "kickstarter",
        kind: "workshop",
        label: "Workshop",
        title: "Launch on Kickstarter",
        description: "Explore how a game project becomes a clear, honest crowdfunding story people can understand.",
        href: `${GO_ORIGIN}/blog/launch-your-game-on-kickstarter-crowdfunding-workshop-for-game-creators`,
        tags: ["crowdfunding", "pitch", "business"],
        icon: Zap,
        accent: "orange",
    },
    zine: {
        key: "zine",
        kind: "workshop",
        label: "Workshop",
        title: "Create Your Own Zine",
        description: "Use a small, expressive format to share ideas, experiments, and the worlds behind your games.",
        href: `${GO_ORIGIN}/blog/create-your-own-zine-join-our-upcoming-zine-workshop`,
        tags: ["expression", "zine", "creative-practice"],
        icon: Network,
        accent: "violet",
    },
    roguelike: {
        key: "roguelike",
        kind: "workshop",
        label: "Workshop",
        title: "How Roguelikes Work",
        description: "Study runs, choices, failure, and variation through a genre that makes systems easy to notice.",
        href: `${GO_ORIGIN}/blog/learn-how-roguelikes-work-join-our-upcoming-workshop`,
        tags: ["systems", "genre", "iteration"],
        icon: Sparkles,
        accent: "blue",
    },
    mentor: {
        key: "mentor",
        kind: "route",
        label: "GO route",
        title: "Find a Mentor",
        description: "Explore GO mentorship when you need focused guidance from another creator.",
        href: `${GO_ORIGIN}/mentorship`,
        tags: ["feedback", "mentor", "guidance"],
        icon: Users,
        accent: "lime",
    },
    projects: {
        key: "projects",
        kind: "route",
        label: "GO route",
        title: "Find a Project",
        description: "Review approved project briefs, open roles, terms, and current status before you join in.",
        href: `${GO_ORIGIN}/projects`,
        tags: ["collaboration", "projects", "contribution"],
        icon: Link2,
        accent: "orange",
    },
    resources: {
        key: "resources",
        kind: "route",
        label: "GO route",
        title: "Community Resources",
        description: "Open the current library of practical material, asset packs, creator stories, and learning signals.",
        href: `${GO_ORIGIN}/resources`,
        tags: ["resources", "reference", "community"],
        icon: GraduationCap,
        accent: "violet",
    },
    events: {
        key: "events",
        kind: "route",
        label: "GO route",
        title: "GO Events",
        description: "Find workshops, meetups, mentorship sessions, and conversations that move your work forward.",
        href: `${GO_ORIGIN}/community`,
        tags: ["events", "workshop", "community"],
        icon: MessageCircle,
        accent: "blue",
    },
    membership: {
        key: "membership",
        kind: "route",
        label: "GO route",
        title: "Review Membership",
        description: "See the current public, Community, Mentor Programme, and Business routes into GO.",
        href: `${GO_ORIGIN}/membership`,
        tags: ["membership", "access", "community"],
        icon: Trophy,
        accent: "lime",
    },
    faq: {
        key: "faq",
        kind: "route",
        label: "GO route",
        title: "GO FAQ",
        description: "Get clear answers about accounts, projects, membership, resources, profiles, and support.",
        href: `${GO_ORIGIN}/faq`,
        tags: ["faq", "support", "clarity"],
        icon: HelpCircle,
        accent: "blue",
    },
};
function routeForQuestion(question) {
    const value = question.toLowerCase();
    if (/(kickstarter|crowdfund|backer|campaign)/.test(value))
        return ROUTES.kickstarter;
    if (/steam/.test(value))
        return ROUTES.steam;
    if (/roguelike/.test(value))
        return ROUTES.roguelike;
    if (/zine/.test(value))
        return ROUTES.zine;
    if (/(mentor|feedback|stuck|advice|review)/.test(value))
        return ROUTES.mentor;
    if (/(project|team|collaborat|role|join)/.test(value))
        return ROUTES.projects;
    if (/(resource|asset|book|guide|material)/.test(value))
        return ROUTES.resources;
    if (/(event|workshop|meetup|session)/.test(value))
        return ROUTES.events;
    if (/(member|price|pricing|paid|community access)/.test(value))
        return ROUTES.membership;
    if (/(faq|support|account|profile|passport)/.test(value))
        return ROUTES.faq;
    if (/(steam|store page|publish|release|launch)/.test(value))
        return ROUTES.steam;
    if (/(kickstarter|crowdfund|backer|campaign)/.test(value))
        return ROUTES.kickstarter;
    if (/(zine|magazine|print|express)/.test(value))
        return ROUTES.zine;
    if (/(roguelike|rogue|procedural|runs|random)/.test(value))
        return ROUTES.roguelike;
    if (/(idea|design|scope|mechanic|player|fun)/.test(value))
        return ROUTES.foundations;
    if (/(prototype|playable|build|engine|code|make)/.test(value))
        return ROUTES.microgame;
    return ROUTES.orientation;
}
function fallbackSummary() {
    return {
        xp: 0,
        level: 1,
        progress: 0,
        badges: [],
        lastRoute: null,
        brainTags: [
            { tag: "starting", count: 18 },
            { tag: "prototype", count: 12 },
            { tag: "design", count: 9 },
            { tag: "community", count: 7 },
        ],
    };
}
function mergeSummary(value) {
    const fallback = fallbackSummary();
    return {
        xp: value?.xp ?? fallback.xp,
        level: value?.level ?? fallback.level,
        progress: value?.progress ?? fallback.progress,
        badges: value?.badges ?? fallback.badges,
        lastRoute: value?.lastRoute ?? fallback.lastRoute,
        brainTags: value?.brainTags?.length ? value.brainTags : fallback.brainTags,
    };
}
const NEIGHBOURS = {
    microgame: ["foundations", "mentor"], foundations: ["microgame", "mentor"],
    orientation: ["microgame", "resources"], mentor: ["projects", "resources"],
    steam: ["kickstarter", "mentor"], kickstarter: ["steam", "mentor"],
};
function pause(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal.aborted)
            return reject(new Error("Cancelled"));
        const abort = () => { clearTimeout(timer); reject(new Error("Cancelled")); };
        const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
        signal.addEventListener("abort", abort, { once: true });
    });
}
export default function Omnivore() {

    const [question, setQuestion] = useState("");
    const [phase, setPhase] = useState("idle");
    const [chewQuestion, setChewQuestion] = useState("");
    const [answerRouteKey, setAnswerRouteKey] = useState(null);
    const [summary, setSummary] = useState(fallbackSummary);
    const [motionPaused, setMotionPaused] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [focused, setFocused] = useState(false);
    const [saved, setSaved] = useState(false);
    const [clip, setClip] = useState(null);
    const [clipPlaying, setClipPlaying] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const [resolvedRoutes, setResolvedRoutes] = useState({});
    const activeRun = useRef(null);
    const inputRef = useRef(null);
    const answerRef = useRef(null);
    const askRef = useRef(async () => null);
    const visitSummary = useRef(fallbackSummary());
    const progressVersion = useRef(0);
    const loading = !["idle", "reveal"].includes(phase);
    const quiet = reducedMotion || motionPaused;
    useEffect(() => {
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");
        const change = () => setReducedMotion(media.matches);
        change();
        media.addEventListener("change", change);
        const controller = new AbortController();
        const unsubscribe = onAuthStateChanged(auth, async user => {
            const version = ++progressVersion.current;
            activeRun.current?.abort();
            activeRun.current = null;
            setAnswerRouteKey(null);
            setPhase("idle");
            setSummary(visitSummary.current);
            setSaved(false);
            if (!user) return;
            try {
                const token = await user.getIdToken();
                const response = await fetch("/api/learning-signal", {
                    signal: controller.signal, headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
                });
                const payload = response.ok ? await response.json() : null;
                if (!controller.signal.aborted && auth.currentUser === user && version === progressVersion.current && payload?.persisted) {
                    setSummary(mergeSummary(payload.summary));
                    setSaved(true);
                }
            } catch { /* Navigation remains available without progress. */ }
        });
        fetch("/animation-manifest.json", { signal: controller.signal })
            .then(r => r.ok ? r.json() : null)
            .then(value => {
            if (typeof value?.chew === "string" && /^\/animations\/[a-zA-Z0-9._-]+\.(webm|mp4)$/.test(value.chew))
                setClip(value.chew);
        }).catch(() => undefined);
        return () => { unsubscribe(); controller.abort(); activeRun.current?.abort(); media.removeEventListener("change", change); };
    }, []);
    useEffect(() => { askRef.current = askQuestion; });
    useEffect(() => {
        const context = document.modelContext;
        if (!context?.registerTool)
            return;
        const lifecycle = new AbortController();
        try {
            void Promise.resolve(context.registerTool({
                name: "ask_galactic_omnivore", title: "Ask the Galactic Omnivore",
                description: "Submit a game-development question, play the mouth-to-eye sequence and display GO learning routes.",
                inputSchema: { type: "object", properties: { question: { type: "string", minLength: 1, maxLength: 500 } }, required: ["question"], additionalProperties: false },
                annotations: { readOnlyHint: false, untrustedContentHint: false },
                execute: async (input) => {
                    const text = typeof input === "object" && input !== null && "question" in input ? input.question : null;
                    if (typeof text !== "string" || !text.trim() || text.length > 500)
                        throw new Error("Enter a question between 1 and 500 characters.");
                    return askRef.current(text);
                }
            }, { signal: lifecycle.signal })).catch(() => undefined);
        }
        catch { /* The visible controls work without WebMCP. */ }
        return () => lifecycle.abort();
    }, []);
    async function sendLearningSignal(route, eventType = "ask") {
        const user = auth.currentUser;
        if (!user) return null;
        const signal = AbortSignal.timeout(3500);
        try {
            const token = await Promise.race([
                user.getIdToken(),
                new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("Progress timed out")), { once: true })),
            ]);
            const response = await fetch("/api/learning-signal", {
                method: "POST", signal,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ eventType, routeKey: route.key, eventId: crypto.randomUUID() }),
            });
            const payload = response.ok ? await response.json() : null;
            return auth.currentUser === user && payload?.persisted === true && payload?.summary ? mergeSummary(payload.summary) : null;
        }
        catch {
            return null;
        }
    }
    async function askQuestion(raw) {
        const text = raw.trim();
        if (!text || text.length > 500)
            return null;
        if (activeRun.current)
            throw new Error("The Omnivore is still chewing. Try again in a moment.");
        const run = new AbortController();
        progressVersion.current++;
        activeRun.current = run;
        const route = routeForQuestion(text);
        setClipPlaying(false);
        setQuestion("");
        setChewQuestion(text);
        setAnswerRouteKey(null);
        setPhase("anticipate");
        const persistence = sendLearningSignal(route);
        const keys = [route.key, ...(NEIGHBOURS[route.key] ?? ['resources', 'mentor'])].slice(0, 3);
        const routeLookup = fetch(`/api/learning-routes?keys=${keys.join(',')}`, { signal: AbortSignal.timeout(5500) })
            .then(r => r.ok ? r.json() : null).then(payload => payload?.routes ?? {}).catch(() => ({}));
        try {
            if (!quiet) {
                for (const [nextPhase, duration] of [["anticipate", 260], ["feed", 420], ["chew", 960], ["swallow", 300]]) {
                    setPhase(nextPhase);
                    await pause(duration, run.signal);
                }
            }
            const [persisted, verifiedRoutes] = await Promise.all([persistence, routeLookup]);
            if (run.signal.aborted)
                return null;
            setResolvedRoutes(verifiedRoutes);
            setSaved(Boolean(persisted));
            if (persisted) setSummary(persisted);
            else {
                const current = visitSummary.current;
                const xp = current.xp + 20;
                const badges = new Set(current.badges);
                badges.add("signal-seeker");
                if (route.key === "foundations")
                    badges.add("scope-scout");
                if (route.key === "microgame")
                    badges.add("builder-spark");
                visitSummary.current = { ...current, xp, level: Math.floor(xp / 100) + 1, progress: xp % 100, badges: [...badges], lastRoute: route.key };
                setSummary(visitSummary.current);
            }
            setAnswerRouteKey(route.key);
            setChewQuestion("");
            setPhase("reveal");
            return { routeKey: route.key, ...(verifiedRoutes[route.key] ?? { title: 'GO Education', href: `${GO_ORIGIN}/education`, verified: false }), xpAwarded: 20 };
        }
        catch (error) {
            if (!run.signal.aborted) {
                setQuestion(text);
                setPhase("idle");
                throw error;
            }
            return null;
        }
        finally {
            if (activeRun.current === run)
                activeRun.current = null;
        }
    }
    useEffect(() => {
        if (answerRouteKey)
            answerRef.current?.focus({ preventScroll: true });
    }, [answerRouteKey]);
    function closeAnswer() {
        setAnswerRouteKey(null);
        setPhase("idle");
        inputRef.current?.focus({ preventScroll: true });
    }
    async function submit(event) {
        event.preventDefault();
        await askQuestion(question);
    }
    const answer = answerRouteKey ? ROUTES[answerRouteKey] : null;
    const resolution = answer ? resolvedRoutes[answer.key] : null;
    const answerTitle = resolution?.title ?? 'Explore GO Education';
    const answerDescription = resolution?.fallback ? resolution.message : resolution?.verified ? answer?.description : 'The live directory is unavailable. Try GO Education to keep exploring.';
    const alternatives = answer ? (NEIGHBOURS[answer.key] ?? ["resources", "mentor"]).filter(key => key !== answer.key).slice(0, 2) : [];
    const status = phase === "anticipate" ? "A tasty question…" : phase === "feed" ? "Taking it in…" : phase === "chew" ? "Chewing on that…" : phase === "swallow" ? "Finding your next step…" : answer ? "A little food for thought." : "What are you curious about?";
    return (<main className="lab-shell single-lab" aria-label="Ask the Galactic Omnivore" data-clarity-mask="true">
      <section className={`omnivore-interface phase-${phase} ${quiet ? "motion-quiet" : ""} ${focused ? "is-listening" : ""} ${answer ? "has-answer" : ""}`} data-phase={phase} aria-label="The Galactic Omnivore learning guide">
        <div className="logo-stage">
          <div className={`character ${imageFailed ? "image-failed" : ""} ${clip && clipPlaying && phase === "chew" && !quiet ? "uses-clip" : ""}`} role="img" aria-label="The Galactic Omnivore">
            <div className="mouth-depth"/>
            <Image className="avatar-base" src={imageFailed ? "/go-logo.png" : "/go-avatar.png"} alt="" fill sizes="(max-width: 680px) 100vw, 800px" priority onError={() => setImageFailed(true)}/>
            {!imageFailed && <Image className="avatar-jaw" src="/go-avatar.png" alt="" fill sizes="(max-width: 680px) 100vw, 800px" priority/>}
            <span className="eye-light" aria-hidden="true"/>
            {clip && phase === "chew" && !quiet && <video className="comfy-clip" src={clip} autoPlay muted playsInline loop onPlaying={() => setClipPlaying(true)} onWaiting={() => setClipPlaying(false)} onError={() => { setClip(null); setClipPlaying(false); }} aria-hidden="true"/>}
          </div>
          <div className="mouth-slot">
            <form className="mouth-search" onSubmit={submit} aria-busy={loading}>
              <Search size={18} aria-hidden="true"/>
              <input ref={inputRef} value={question} onChange={event => setQuestion(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} readOnly={loading} maxLength={500} placeholder="Ask me about making games…" aria-label="Ask the Galactic Omnivore" aria-describedby="mouth-hint"/>
              <button type="submit" aria-label="Feed question to the Galactic Omnivore" disabled={loading || !question.trim()}><ArrowUpRight size={20}/></button>
            </form>
            {loading && <span className="question-morsel" aria-hidden="true">{chewQuestion}</span>}
            <p id="mouth-hint" className="mouth-hint" role="status">{status}</p>
          </div>
          <button className="motion-control" type="button" aria-label={quiet ? "Enable animation" : "Pause animation"} aria-pressed={quiet} onClick={() => setMotionPaused(!motionPaused)} disabled={reducedMotion} title={reducedMotion ? "Reduced motion follows your device setting" : "Toggle animation"}>
            {quiet ? <Play size={15}/> : <Pause size={15}/>}
          </button>
          {answer && (<article className="eye-answer" ref={answerRef} tabIndex={-1} aria-label="Your learning routes" onKeyDown={event => { if (event.key === "Escape")
            closeAnswer(); }}>
              <button className="close-eye" type="button" onClick={closeAnswer} aria-label="Close answer"><X size={20}/></button>
              <h1>{answerTitle}</h1>
              {answer.key === "orientation" && <><p>Start by noticing the repeating action in a game you know.</p><Link className="primary-answer" href="/education/starter-pathway#world-notice">Open mission: Notice</Link></>}
              <p>{answerDescription}</p>
              <a className="primary-answer" href={`/api/go-link?key=${answer.key}`} target="_blank" rel="noreferrer" onClick={() => { void sendLearningSignal(answer, "open_route").then(value => { if (value) {
            setSummary(value); setSaved(true); } }); }}>Explore {resolution?.fallback || !resolution ? 'GO Education' : 'this route'} <ArrowUpRight size={18}/></a>
              <div className="related-answers" aria-label="More ways to explore">{alternatives.filter(key => resolvedRoutes[key]?.verified && !resolvedRoutes[key]?.fallback).map(key => <a key={key} href={`/api/go-link?key=${key}`} target="_blank" rel="noreferrer">{resolvedRoutes[key].title}<ArrowUpRight size={14}/></a>)}</div>
              <footer><span>{summary.xp} XP · Level {summary.level}{saved ? " · saved to your account" : " · this visit"}</span><Link href="/education">Browse all learning</Link></footer>
            </article>)}
        </div>
        <noscript><p className="no-script">This guide needs JavaScript. <a href={`${GO_ORIGIN}/education`}>Browse GO Education</a> to keep learning.</p></noscript>
      </section>

    </main>);
}
