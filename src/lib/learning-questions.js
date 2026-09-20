export function cleanLearningQuestion(input) {
  const question = String(input.question || '').trim();
  if (question.length < 12 || question.length > 2000) throw Object.assign(new Error('Write a question between 12 and 2,000 characters.'), { status: 400 });
  if (input.publishConsent !== true) throw Object.assign(new Error('Confirm that GO may edit and publish your question and answer.'), { status: 400 });
  return question;
}

export function publicLearningAnswer(id, data) {
  return { id, question: data.publicQuestion || data.question, answer: String(data.answer || ''),
    attribution: data.publicAttribution || 'Anonymous', updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    href: `/learn/answers/${id}` };
}

export function rankLearningAnswers(answers, query) {
  const words = String(query || '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];
  if (!words.length) return answers.slice(0, 12);
  return answers.map(answer => ({ answer, score: words.reduce((score, word) => score + (String(answer.question).toLowerCase().includes(word) ? 3 : 0) + (String(answer.answer).toLowerCase().includes(word) ? 1 : 0), 0) }))
    .filter(row => row.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map(row => row.answer);
}
