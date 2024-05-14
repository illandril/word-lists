import badwords from 'badwords/array.js';
import naughtyWords from 'naughty-words';
import normalize from './normalize';

const excluded = new Set<string>();
const exclude = (word: string) => {
  try {
    const normalized = normalize(word, { validate: true });
    excluded.add(normalized);
  } catch {
    // ignore
  }
};
for (const badword of badwords) {
  exclude(badword);
}

for (const word of naughtyWords.en) {
  exclude(word);
}

export const shouldExclude = (word: string) => excluded.has(normalize(word));
