import t2 from './wiktionary-tags-2';
import t3 from './wiktionary-tags-3';
import t4 from './wiktionary-tags-4';
import t5 from './wiktionary-tags-5';
import t6 from './wiktionary-tags-6';
import t7 from './wiktionary-tags-7';
import t8 from './wiktionary-tags-8';
import t9 from './wiktionary-tags-9';
import t10 from './wiktionary-tags-10';

const all = [t2, t3, t4, t5, t6, t7, t8, t9, t10];

export const getTags = (word: string): string[][] | null => {
  const index = word.length - 2;
  const tags: Partial<Record<string, string[][]>> | null = index >= 0 && index < all.length ? all[index] : null;
  return tags?.[word.toLowerCase()] ?? null;
};
