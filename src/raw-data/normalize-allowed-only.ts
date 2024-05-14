import normalize from './normalize';

export const MIN = 3;
export const MAX = 10;

const tripletPattern = /([A-Z])\1\1/;
const noVowelsPattern = /^[^AEIOUY]+$/;

export const isAllowedLength = (word: string) => word.length >= MIN && word.length <= MAX;

const normalizeAllowedOnly = (value: string): string | null => {
  let word: string;
  try {
    word = normalize(value, { validate: true });
  } catch {
    return null;
  }
  if (!isAllowedLength(word)) {
    return null;
  }
  if (tripletPattern.test(word) || noVowelsPattern.test(word)) {
    // While there are some words with triplets (e.g. goddessship), no vowels (e.g. crwth, tsk),
    // or both (e.g. brrr, hmmm), they're all either proper nouns, sounds, abbreviations, more
    // commonly hyphenated, or Welsh (at least all I could find), so we might as well strip
    // them out early.
    return null;
  }
  // if (!isInScowl(word)) {
  //   return null;
  // }
  return word;
};

export default normalizeAllowedOnly;
