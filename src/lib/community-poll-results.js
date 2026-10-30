export function summarizePollResults(options, counts) {
  const values = options.map((_, index) => Math.max(0, Number(counts?.[index]) || 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  const highest = Math.max(0, ...values);
  return { total, winners: highest ? options.filter((_, index) => values[index] === highest) : [] };
}
