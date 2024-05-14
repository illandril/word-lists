import { writeFileSync } from 'node:fs';
import { read } from './file';

const changedLengths = new Set<number>();
const definedByLengthMap = new Map<number, Set<string>>();
const notDefinedByLengthMap = new Map<number, Set<string>>();

const loadCache = async (length: number) => {
  const defined = new Set<string>();
  const notDefined = new Set<string>();
  if (length < 1 || length > 20) {
    return [defined, notDefined] as const;
  }
  try {
    for await (const line of read(new URL(`wiktionary-cache/${length}-defined.txt`, import.meta.url))) {
      // Should always be true... but just in case a blank
      // or extra line snuck in
      if (line.length === length) {
        defined.add(line);
      }
    }
  } catch {
    // ignore
  }
  try {
    for await (const line of read(new URL(`wiktionary-cache/${length}-undefined.txt`, import.meta.url))) {
      // Should always be true... but just in case a blank
      // or extra line snuck in
      if (line.length === length) {
        notDefined.add(line);
      }
    }
  } catch {
    // ignore
  }
  return [defined, notDefined] as const;
};

const lookup = async (word: string): Promise<boolean | null> => {
  try {
    const resp = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word.toLowerCase())}`,
      {
        headers: {
          accept: 'application/json; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/definition/0.8.0"',
        },
      },
    );
    if (resp.status === 404) {
      return false;
    }
    if (!resp.ok) {
      throw new Error(`Unexpected response: ${resp.status}`);
    }

    const data = await resp.json();

    if (!data || typeof data !== 'object') {
      throw new Error(`Unexpected response data: ${JSON.stringify(data)}`);
    }
    return 'en' in data && Array.isArray(data.en) && data.en.length > 0;
  } catch (e) {
    // biome-ignore lint/nursery/noConsole: Debuging
    console.error('Error checking definition', e);
    return null;
  }
};

export const isDefined = async (word: string): Promise<boolean> => {
  let defined = definedByLengthMap.get(word.length);
  let notDefined = notDefinedByLengthMap.get(word.length);
  if (!(defined && notDefined)) {
    [defined, notDefined] = await loadCache(word.length);
    definedByLengthMap.set(word.length, defined);
    notDefinedByLengthMap.set(word.length, notDefined);
  }
  if (defined.has(word)) {
    return true;
  }
  if (notDefined.has(word)) {
    return false;
  }
  let attempts = 0;
  let isDefined: boolean | null = null;
  while (isDefined === null && attempts < 3) {
    isDefined = await lookup(word);
    attempts++;
  }
  if (isDefined === null) {
    throw new Error(`Could not lookup word: ${word}`);
  }
  changedLengths.add(word.length);
  if (isDefined) {
    defined.add(word);
  } else {
    notDefined.add(word);
  }
  return isDefined;
};

export const saveCache = async () => {
  for (const length of changedLengths) {
    // biome-ignore lint/nursery/noConsole: Debugging
    console.log('saveCache', length);
    const defined = definedByLengthMap.get(length);
    const notDefined = notDefinedByLengthMap.get(length);
    if (defined) {
      await writeFileSync(new URL(`wiktionary-cache/${length}-defined.txt`, import.meta.url), [...defined].join('\n'));
    }
    if (notDefined) {
      await writeFileSync(
        new URL(`wiktionary-cache/${length}-undefined.txt`, import.meta.url),
        [...notDefined].join('\n'),
      );
    }
    changedLengths.delete(length);
  }
};
