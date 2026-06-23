const WIKI_UA = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
};

/** Devuelve source para React Native Image con User-Agent para Wikimedia. */
export function imgSource(url: string | null | undefined) {
  if (!url) return null;
  const needsUA = url.includes('wikimedia.org');
  return needsUA ? { uri: url, headers: WIKI_UA } : { uri: url };
}
