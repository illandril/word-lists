import fs from 'node:fs';
import readline from 'node:readline';
import { read } from '../file';

type NgramUsageData = {
  matchCount: number;
  volumeCount: number;
};
export type YearlyNgramUsageData = Partial<Record<string, NgramUsageData>>;
export type YearlyNgramUsageMap = Map<number, NgramUsageData>;

export const parseNgram3Log10File = async (
  file: string,
  callback: (word: string, data: YearlyNgramUsageMap) => Promise<void>,
) => {
  let startingYear = 0;
  for await (const line of read(file)) {
    const data = line.split('\t');
    const value = data.shift();
    if (!value) {
      continue;
    }
    if (value === '#w') {
      startingYear = Number(data[0]);
      continue;
    }
    const yearData: YearlyNgramUsageMap = new Map<number, NgramUsageData>();
    let year = startingYear;
    for (const yearCount of data) {
      const [matchLog10, volumeLog10] = yearCount.split(',').map((value) => Number(value));
      const matchCount =
        matchLog10 === undefined || Number.isNaN(matchLog10) ? 0 : Math.round(10 ** (matchLog10 + 0.49));
      const volumeCount =
        volumeLog10 === undefined || Number.isNaN(volumeLog10) ? matchCount : Math.round(10 ** (volumeLog10 + 0.49));
      yearData.set(year, { matchCount, volumeCount });
      year++;
    }
    await callback(value, yearData);
  }
};

export const parseNgram3File = async (
  file: string,
  {
    normalize,
    includeYear,
    getMap,
  }: {
    normalize: (value: string) => string | null;
    includeYear: (year: number, matchCount: number, volumeCount: number) => boolean;
    getMap: (word: string) => Map<string, YearlyNgramUsageData>;
  },
) => {
  for await (const line of read(file)) {
    const data = line.split('\t');
    const value = data.shift();
    if (!value) {
      continue;
    }
    const word = normalize(value);
    if (!word) {
      continue;
    }
    const words = getMap(word);
    const yearData: YearlyNgramUsageData = words.get(word) || {};
    for (const yearCount of data) {
      const [year, matchCount, volumeCount] = yearCount.split(',').map((value) => Number(value));
      if (includeYear(year, matchCount, volumeCount)) {
        const usageData = yearData[`${year}`] || { matchCount: 0, volumeCount: 0 };
        usageData.matchCount += matchCount;
        usageData.volumeCount += volumeCount;

        yearData[`${year}`] = usageData;
      }
    }
    if (Object.keys(yearData).length > 0) {
      words.set(word, yearData);
    }
  }
};

export const parseNgram3FileSum = async (
  file: string,
  {
    normalize,
    includeYear,
    getMap,
  }: {
    normalize: (value: string) => string | null;
    includeYear: (year: number, matchCount: number, volumeCount: number) => boolean;
    getMap: (word: string) => Map<string, [number, number]>;
  },
) => {
  const stream = fs.createReadStream(file);
  stream.setEncoding('utf-8');
  const streamReadline = readline.createInterface({ input: stream, crlfDelay: Number.POSITIVE_INFINITY });
  for await (const line of streamReadline) {
    const data = line.split('\t');
    const value = data.shift();
    if (!value) {
      continue;
    }
    const word = normalize(value);
    if (!word) {
      continue;
    }
    const words = getMap(word);
    const yearData = words.get(word) || [0, 0];
    for (const yearCount of data) {
      const [year, matchCount, volumeCount] = yearCount.split(',').map((value) => Number(value));
      if (includeYear(year, matchCount, volumeCount)) {
        yearData[0] += matchCount;
        yearData[1] += volumeCount;
      }
    }
    if (yearData[0] > 0) {
      words.set(word, yearData);
    }
  }
};
