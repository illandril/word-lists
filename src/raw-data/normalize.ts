const letters = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
] as const;
export type Letter = (typeof letters)[number];

const alphabet: Readonly<Set<Letter>> = new Set(letters);

export const PATTERN = new RegExp(`^[${[...alphabet].join('')}]+$`);

const normalize = (
  value: string,
  {
    validate,
    ignoreDiacritics,
  }: {
    validate?: boolean;
    ignoreDiacritics?: boolean;
  } = {},
) => {
  let normalized = value.normalize('NFD');
  if (ignoreDiacritics) {
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: Matches on diacritic special characters
    normalized = normalized.replace(/[\u0300-\u036f]/g, '');
  }
  normalized = normalized.toLocaleUpperCase('en-US');
  if (validate && !PATTERN.test(normalized)) {
    throw new Error(`Word contains an unsupported character (or is empty)'`);
  }
  return normalized;
};

export default normalize;
