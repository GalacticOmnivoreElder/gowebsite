export default function StarterAchievements({ record }) {
  if (!record?.lessons?.length) return null;
  return <section className="rounded-lg border p-5 space-y-3" aria-label="Starter Pathway achievements">
    <h2 className="text-xl font-semibold">{record.complete ? 'Starter Game Maker' : 'Starter Pathway'}</h2>
    <p>{record.lessons.length} of 6 worlds complete</p>
    {record.publicSummary && <p className="whitespace-pre-wrap">{record.publicSummary}</p>}
    <ul className="space-y-2">{record.lessons.map(lesson => <li key={lesson.id}><strong>{lesson.badgeTitle}</strong> — {lesson.skillTitle} <time dateTime={lesson.completedAt}>{lesson.completedAt.slice(0, 10)}</time></li>)}</ul>
  </section>;
}
