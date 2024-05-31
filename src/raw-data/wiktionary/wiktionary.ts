import { writeFileSync } from 'node:fs';
import { read } from '../file';
import lookup, { Status } from './lookup';
import { getTags } from './tags';

class Cache {
  private readonly changedLengths = new Set<number>();
  private readonly wordsByLength = new Map<number, Set<string>>();
  constructor(public readonly status: Status) {
    // Nothing to do
  }

  async isInStatus(word: string) {
    return (await this.getWords(word.length)).has(word);
  }

  async register(word: string) {
    const set = await this.getWords(word.length);
    if (!set.has(word)) {
      set.add(word);
      this.changedLengths.add(word.length);
    }
  }

  async writeCache() {
    for (const length of this.changedLengths) {
      // biome-ignore lint/nursery/noConsole: Debugging
      console.log('saveCache', this.status, length);
      const words = [...(await this.getWords(length))];
      this.changedLengths.delete(length);
      await writeFileSync(this.getCacheUrl(length), words.join('\n'));
    }
  }

  async getWords(length: number) {
    let wordsForLength = this.wordsByLength.get(length);
    if (!wordsForLength) {
      wordsForLength = await this.loadCache(length);
      this.wordsByLength.set(length, wordsForLength);
    }
    return wordsForLength;
  }

  private async loadCache(length: number) {
    const words = new Set<string>();
    if (length > 1 && length <= 20) {
      try {
        for await (const line of read(this.getCacheUrl(length))) {
          // Should always be true... but just in case a blank
          // or extra line snuck in
          if (line.length === length) {
            words.add(line);
          }
        }
      } catch {
        // ignore
      }
    }
    return words;
  }

  private getCacheUrl(length: number) {
    return new URL(`cache/${length}-${this.status}.txt`, import.meta.url);
  }
}

const cacheByStatus = new Map<Status, Cache>();
for (const status of Object.values(Status)) {
  cacheByStatus.set(status, new Cache(status));
}
const getCachedStatus = async (word: string) => {
  for (const status of Object.values(Status)) {
    if (await cacheByStatus.get(status)?.isInStatus(word)) {
      return status;
    }
  }
  return null;
};

const excludedTags = [
  /^lb\|en(?:\|[^|]+)*\|(?:informal|slang|stenoscript|internet slang|fandom slang|obsolete|archaic|nonstandard|text messaging|euphemism|derogatory|pharmaceutical drug|offensive|vulgar)/i,
  /^abbr(?:eviation)? of\|/i,
  /^eye dialect of\|/i,
  /^misspelling of\|/i,
  /^(?:obsolete|archaic|dated|euphemistic) (?:spelling|form) of\|/i,
  /^obs (?:sp|form)\|/i,
];

const formOfMatchers = [
  /^(?:plural|alternative spelling|alternative form) of\|en\|([^|]+)/,
  /^(?:plural|altform|alt form)\|en\|([^|]+)/,
];
const formOf = (tag: string) => {
  for (const matcher of formOfMatchers) {
    const match = matcher.exec(tag);
    if (match) {
      return match[1];
    }
  }
  return null;
};

const isExcludedTag = (tag: string): boolean => {
  return excludedTags.some((matcher) => matcher.test(tag));
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Acceptable (for now)
const areAllTagSetsExcluded = (word: string, isFormOf?: boolean): boolean => {
  const tags = getTags(word);
  if (!tags?.length) {
    // No tags at all, so all 0 definitions are allowed
    return false;
  }

  for (const tagSet of tags) {
    if (tagSet.length === 0) {
      // No tags on the definition, so it is allowed
      return false;
    }
    if (!tagSet.some((tag) => isExcludedTag(tag))) {
      return false;
    }
    if (!isFormOf) {
      for (const tag of tagSet) {
        const form = formOf(tag);
        if (form) {
          if (!areAllTagSetsExcluded(form, true)) {
            return false;
          }
        }
      }
    }
  }
  return true;
};

export const isDefined = async (word: string): Promise<boolean> => {
  let status = (await getCachedStatus(word)) ?? Status.Error;
  let attempts = 0;
  while (status === Status.Error && attempts < 3) {
    status = await lookup(word);
    attempts++;
  }
  await cacheByStatus.get(status)?.register(word);

  if (status === Status.Defined && areAllTagSetsExcluded(word)) {
    status = Status.Excluded;
  }
  return status === Status.Defined;
};

export const saveCache = async () => {
  for (const cache of cacheByStatus.values()) {
    await cache.writeCache();
  }
};
