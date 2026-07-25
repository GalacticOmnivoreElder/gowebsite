export function normalizeTag(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function addTag(values = [], candidate) {
  const tag = normalizeTag(candidate);
  if (!tag) return Array.isArray(values) ? values : [];

  const current = Array.isArray(values) ? values : [];
  const exists = current.some(
    (value) => normalizeTag(value).toLocaleLowerCase() === tag.toLocaleLowerCase()
  );
  return exists ? current : [...current, tag];
}

export function removeTag(values = [], tag) {
  const normalized = normalizeTag(tag).toLocaleLowerCase();
  return (Array.isArray(values) ? values : []).filter(
    (value) => normalizeTag(value).toLocaleLowerCase() !== normalized
  );
}

export function getTagSuggestions(
  options = [],
  selected = [],
  query = "",
  limit = 8
) {
  const selectedTags = new Set(
    (Array.isArray(selected) ? selected : []).map((value) =>
      normalizeTag(value).toLocaleLowerCase()
    )
  );
  const normalizedQuery = normalizeTag(query).toLocaleLowerCase();

  return (Array.isArray(options) ? options : [])
    .filter((option) => {
      const normalized = normalizeTag(option);
      const key = normalized.toLocaleLowerCase();
      return (
        normalized &&
        !selectedTags.has(key) &&
        (!normalizedQuery || key.includes(normalizedQuery))
      );
    })
    .slice(0, limit);
}
