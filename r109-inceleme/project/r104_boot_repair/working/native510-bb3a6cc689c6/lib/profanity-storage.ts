import { db } from "@/lib/game-world";
import { maskProfanity } from "@/lib/profanity";

export async function loadBlockedWords() {
  const result = await db().prepare("SELECT word FROM blocked_words ORDER BY word LIMIT 500").all<{ word: string }>();
  return result.results.map((row: { word: string }) => row.word);
}

export async function filterChatText(value: string) {
  // Read canonical rules on every send; no stale per-isolate cache after admin edits.
  return maskProfanity(value, await loadBlockedWords());
}
