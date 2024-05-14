import { read } from '../file';

const scowlByLengthMap = new Map<number, Set<string>>();

const loadScowl = async (length: number) => {
  const set = new Set<string>();
  if (length < 1 || length > 20) {
    return set;
  }
  for await (const line of read(new URL(`${length}.txt.br`, import.meta.url))) {
    // Should always be true... but just in case a blank
    // or extra line snuck in
    if (line.length === length) {
      set.add(line);
    }
  }
  return set;
};

const isInScowl = async (word: string) => {
  let set = scowlByLengthMap.get(word.length);
  if (!set) {
    set = await loadScowl(word.length);
    scowlByLengthMap.set(word.length, set);
  }

  return set.has(word);
};

export default isInScowl;
