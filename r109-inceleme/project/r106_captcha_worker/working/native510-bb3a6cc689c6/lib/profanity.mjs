// Literal words only: administrator input is never executed as a regular expression.
export const DEFAULT_BLOCKED_WORDS = [
  "amk", "aq", "amq", "amina", "aminakoyim", "aminakoyayim", "amcik", "sik", "sikerim", "sikeyim", "siktir", "sikis", "sikik", "sikim", "sikiyim",
  "orospu", "orospucocugu", "oc", "pic", "yarrak", "yarak", "got", "gotveren", "ibne", "pezevenk", "kahpe", "kaltak", "dalyarak", "dallama", "gavat",
  "fuck", "fucking", "fucker", "motherfucker", "bitch", "asshole", "bastard", "shit", "dick", "cunt",
];
const aliases = { "ı": "i", "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i", "а": "a", "е": "e", "о": "o", "с": "c", "і": "i" };
function fold(char) {
  return [...char.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "")].map(c => aliases[c] ?? c).join("");
}
export function normalizeBlockedWord(value) {
  return [...value].map(fold).join("").replace(/[^a-z]/g, "");
}
export function maskProfanity(value, customWords = []) {
  let normalized = "";
  const positions = [];
  let offset = 0;
  for (const char of value) {
    for (const c of fold(char)) { normalized += c; positions.push({ start: offset, end: offset + char.length }); }
    offset += char.length;
  }
  const masked = new Set();
  for (const word of new Set([...DEFAULT_BLOCKED_WORDS, ...customWords].map(normalizeBlockedWord))) {
    if (word.length < 2 || word.length > 40) continue;
    // Boundaries keep ordinary words such as "sıkıntı", "açık" and "götür" intact.
    // Repeated letters, punctuation, spacing, zero-width and common leetspeak are folded.
    // Collapse identical runs to avoid overlapping quantifiers on long custom rules.
    const letters = [...word.replace(/(.)\1+/g, "$1")].map(c => `${c}+`).join("[^a-z0-9]{0,6}");
    const expression = new RegExp(`(?<![a-z0-9])${letters}(?:lar|ler|larin|lerin|sin|siniz|lik|ligi|im|in|ini|iniz|um|un|unu|unuz|tir|dir)?(?![a-z0-9])`, "g");
    for (const match of normalized.matchAll(expression)) {
      const start = positions[match.index]?.start;
      const end = positions[match.index + match[0].length - 1]?.end;
      if (start === undefined || end === undefined) continue;
      for (let i = start; i < end; i++) masked.add(i);
    }
  }
  return value.split("").map((char, i) => masked.has(i) ? "*" : char).join("");
}

// Names have no natural word boundaries. Match unmistakable compounds too,
// while short roots remain boundary checked to preserve Işık, Beşiktaş, etc.
export function hasForbiddenCharacterName(value, customWords = []) {
  if (maskProfanity(value, customWords) !== value) return true;
  const compact = normalizeBlockedWord(value).replace(/(.)\1+/g, '$1');
  const compounds = [...DEFAULT_BLOCKED_WORDS.filter(w => w.length >= 4),
    'siken', 'sikici', 'sikmis', 'sikti', 'sikmek', 'sikilir', 'siktim',
    'picoglu', 'picler',
    // Short roots inside explicit insults; do not reject ordinary words such as Işık.
    'sikkafa', 'sikbas', 'siksurat', 'sikbeyin', 'sikagiz', 'sikburun',
    'sikyuz', 'siksok', 'sikmerak', 'siksever', 'sikyala', 'sikoglu',
    'gotkafa', 'gotbas', 'gotsurat', 'gotoglu', 'gotlale',
    'amk', 'amq', ...customWords.filter(w => normalizeBlockedWord(w).length >= 4)];
  return compounds.some(word => {
    const folded = normalizeBlockedWord(word).replace(/(.)\1+/g, '$1');
    return folded.length >= 3 && compact.includes(folded);
  });
}
