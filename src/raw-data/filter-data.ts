import fs from 'node:fs';
import path, { join } from 'node:path';
import readline from 'node:readline';
import { program } from 'commander';
import isInScowl from './SCOWL/isInScowl';
import { type YearlyNgramUsageData, parseNgram3File, parseNgram3Log10File } from './google-ngram/ngram3';
import normalize from './normalize';
import normalizeAllowedOnly from './normalize-allowed-only';
import { shouldExclude } from './profanity';
import extractTags from './wiktionary/extractTags';
import { isDefined, saveCache } from './wiktionary/wiktionary';

const log = console.log;
const error = console.error;

program
  .command('extract-wiktionary-tags')
  .description('Extract tags from the english definitions from raw wiktionary export xml')
  .argument('<input>', 'Path to raw Wiktionary XML')
  .argument('<output>', 'Path to the output directory')
  .action(async (input, outputPath) => {
    if (!fs.lstatSync(input).isFile()) {
      program.error(`Could not read ${input} - not a file`);
    }
    if (fs.existsSync(outputPath) && fs.readdirSync(outputPath).length) {
      program.error('Output directory already exists');
    }
    fs.mkdirSync(outputPath, { recursive: true });
    const tagEmitter = extractTags(input, ({ title }) => /^[a-z]{2,10}$/.test(title));

    let count = 0;
    tagEmitter.on('page', (page) => {
      fs.appendFileSync(
        path.join(outputPath, `wiktionary-tags-${page.title.length}.ts`),
        `${JSON.stringify(page)},\n`,
        {
          encoding: 'utf8',
        },
      );
      count++;
      if (count % 1000 === 0) {
        log(count, page.title);
      }
    });

    await new Promise<void>((resolve) => {
      tagEmitter.on('end', () => {
        for (const fileName of fs.readdirSync(outputPath)) {
          const filePath = path.join(outputPath, fileName);
          const data = fs.readFileSync(filePath, { encoding: 'utf-8' });

          const values = JSON.parse(`[\n${data.substring(0, data.length - 2)}\n]`);
          const map = new Map<string, string[][]>();
          for (const entry of values) {
            map.set(entry.title, [...(map.get(entry.title) ?? []), ...entry.tags]);
          }

          fs.writeFileSync(
            filePath,
            `export default ${JSON.stringify(
              Object.fromEntries([...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
            )}`,
            { encoding: 'utf-8' },
          );
        }
        resolve();
      });
    });
  });

program
  .command('ngram3-log10')
  .description('Parse a directory of normalized ngram3 log10 data')
  .argument('<input>', 'Path to the input directory')
  .argument('<output>', 'Path to the output directory')
  .action(async (inputPath, outputPath) => {
    if (fs.existsSync(outputPath) && fs.readdirSync(outputPath).length) {
      program.error('Output directory already exists');
    }
    const files = fs.readdirSync(inputPath);
    if (files.length === 0) {
      program.error('No files found');
    }
    log(`Reading ${files.length} files`);
    fs.mkdirSync(outputPath, {
      recursive: true,
    });

    for (const fileName of files) {
      log(`> ${fileName}`);
      const file = join(inputPath, fileName);
      if (!fs.lstatSync(file).isFile()) {
        error(`Could not read ${file} - not a file`);
        continue;
      }

      const words = new Map<string, number>();
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Acceptable complexity
      await parseNgram3Log10File(file, async (word, data) => {
        if (shouldExclude(word)) {
          return;
        }
        if (!(await isInScowl(word))) {
          return;
        }
        if (!(await isDefined(word))) {
          return;
        }
        const score = [...data.values()].reduce((acc, curr) => acc + curr.matchCount + curr.volumeCount * 5, 0);
        // Score barriers are fairly arbitrary
        if (word.length === 4 && score < 200_000) {
          return;
        }
        if (word.length === 5 && score < 100_000) {
          return;
        }
        if (word.length === 6 && score < 30_000) {
          return;
        }
        if (word.length === 7 && score < 10_000) {
          return;
        }
        if (word.length === 8 && score < 2_500) {
          return;
        }
        words.set(word, score);
        if (words.size % 100 === 0) {
          log(word, score);
          await saveCache();
        }
      });

      const byScore = [...words.entries()]
        .sort(([_wordA, scoreA], [_wordB, scoreB]) => scoreB - scoreA)
        .map(([word]) => `${word}`);
      fs.writeFileSync(join(outputPath, fileName.replace('.br', '.txt')), byScore.join('\n'), {
        encoding: 'ascii',
      });
      await saveCache();
    }
  });

program
  .command('ngram3-normalize-condensed')
  .description(
    'Parse a directory of files using the same format as Google Ngram version 3 (ngram TAB year,match_count,volume_count TAB year,...)',
  )
  .argument('<input>', 'Path to the input directory')
  .argument('<output>', 'Path to the output file')
  .action(async (inputPath, outputPath) => {
    const minYear = 2000;
    const maxYear = 2019;
    if (fs.existsSync(outputPath)) {
      program.error('Output file already exists');
    }
    const files = fs.readdirSync(inputPath);
    if (files.length === 0) {
      program.error('No files found');
    }
    log(`Reading ${files.length} files`);

    const words = new Map<string, YearlyNgramUsageData>();
    for (const fileName of files) {
      log(`> ${fileName}`);
      const file = join(inputPath, fileName);
      if (!fs.lstatSync(file).isFile()) {
        error(`Could not read ${file} - not a file`);
        continue;
      }

      await parseNgram3File(file, {
        normalize: normalizeAllowedOnly,
        includeYear: (year, matchCount, volumeCount) => {
          if (year > maxYear) {
            throw new Error(`Data for a year above maxYear (${maxYear}) found: ${year}`);
          }
          return year >= minYear && (matchCount > 0 || volumeCount > 0);
        },
        getMap: () => words,
      });
    }
    const years = Array.from({ length: maxYear - minYear + 1 }, (_v, k) => minYear + k);
    const lines: string[] = [['#w', ...years].join('\t')];
    for (const [word, yearData] of words.entries()) {
      lines.push(
        [
          word,
          ...years.map((year) => {
            const ngram = yearData[`${year}`];
            if (!ngram || ngram.matchCount === 0) {
              return '';
            }
            const logMatchCount = Math.round(Math.log10(ngram.matchCount));
            const logVolumeCount = Math.round(Math.log10(ngram.volumeCount));
            if (logMatchCount === logVolumeCount) {
              return `${logMatchCount}`;
            }
            return `${logMatchCount},${logVolumeCount}`;
          }),
        ]
          .join('\t')
          .trimEnd(),
      );
    }
    fs.writeFileSync(outputPath, lines.sort().join('\n'), {
      encoding: 'ascii',
    });
  });

program
  .command('txt-split')
  .description('Split a file that has one word per line into one file per length')
  .argument('<input>', 'Path to the input file')
  .argument('<output>', 'Path to the output directory')
  .action(async (inputPath, outputPath) => {
    if (fs.existsSync(outputPath) && fs.readdirSync(outputPath).length) {
      program.error('Output directory already exists');
    }

    if (!fs.lstatSync(inputPath).isFile()) {
      program.error(`Could not read ${inputPath} - not a file`);
    }
    fs.mkdirSync(outputPath, {
      recursive: true,
    });

    const stream = fs.createReadStream(inputPath);
    stream.setEncoding('utf-8');
    const streamReadline = readline.createInterface({ input: stream, crlfDelay: Number.POSITIVE_INFINITY });
    const linesMap = new Map<number, Set<string>>();
    for await (const line of streamReadline) {
      try {
        const normalized = normalize(line, { validate: true });
        let lines = linesMap.get(normalized.length);
        if (!lines) {
          lines = new Set();
          linesMap.set(normalized.length, lines);
        }
        lines.add(normalized);
      } catch {
        // Ignore
      }
    }
    for (const [length, lines] of linesMap.entries()) {
      fs.writeFileSync(join(outputPath, `${length}.txt`), [...lines].sort().join('\n'), {
        encoding: 'ascii',
      });
    }
  });

program.parse();
