const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const flattenRoutes = (routes, parents = []) => routes.flatMap((route) => {
  if (!route || route.enabled === false || route.hidden) return [];
  const nextParents = route.name ? [...parents, route.name] : parents;

  if (Array.isArray(route.items)) {
    return flattenRoutes(route.items, nextParents);
  }

  if (!route.path || route.path.includes(':') || !route.layout) return [];
  return [{
    name: route.name || route.path,
    path: `${route.layout}${route.path.startsWith('/') ? route.path : `/${route.path}`}`,
    group: parents.at(-1) || '',
  }];
});

const levenshteinDistance = (left, right) => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
      diagonal = above;
    }
  }

  return previous[right.length];
};

const getTokenSimilarity = (queryToken, targetTokens) => Math.max(
  0,
  ...targetTokens.map((targetToken) => {
    if (targetToken.startsWith(queryToken) || queryToken.startsWith(targetToken)) return 0.92;
    const distance = levenshteinDistance(queryToken, targetToken);
    return 1 - distance / Math.max(queryToken.length, targetToken.length);
  })
);

export const searchAccessibleRoutes = (routes, query, limit = 7) => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  const queryTokens = normalizedQuery.split(/\s+/);
  return flattenRoutes(routes)
    .map((route) => {
      const normalizedName = normalize(route.name);
      const normalizedGroup = normalize(route.group);
      const normalizedPath = normalize(route.path);
      const searchableText = `${normalizedName} ${normalizedGroup} ${normalizedPath}`;
      const targetTokens = normalize(searchableText).split(/\s+/);
      const similarities = queryTokens.map((token) => getTokenSimilarity(token, targetTokens));
      if (similarities.some((similarity) => similarity < 0.62)) return null;

      let score = similarities.reduce((total, similarity) => total + similarity, 0) / similarities.length;
      if (normalizedName === normalizedQuery) score += 2;
      else if (normalizedName.startsWith(normalizedQuery)) score += 1.5;
      else if (searchableText.includes(normalizedQuery)) score += 1;

      return { ...route, score };
    })
    .filter(Boolean)
    .sort((first, second) => second.score - first.score || first.name.localeCompare(second.name))
    .slice(0, limit);
};
