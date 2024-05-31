import EventEmitter from 'node:events';
import fs, { type PathLike } from 'node:fs';
import flow from 'xml-flow';

type PageText = {
  title: string;
  text: string;
};

const readPages = (path: PathLike, filter?: (page: PageText) => boolean) => {
  const emitter = new EventEmitter<{
    page: [PageText];
    end: [];
  }>();
  const inXml = fs.createReadStream(path);
  const xmlStream = flow(inXml, {
    normalize: false,
    simplifyNodes: false,
  });
  xmlStream.on('end', () => emitter.emit('end'));
  xmlStream.on('tag:page', (page) => {
    if (!(page.title && page.revision?.text)) {
      return;
    }
    try {
      const title: string = typeof page.title === 'string' ? page.title : page.title.$text;
      const text: string = typeof page.revision.text === 'string' ? page.revision.text : page.revision.text.$text;
      if (title && text) {
        const page = { title, text };
        if (filter?.(page) !== false) {
          emitter.emit('page', page);
        }
      }
    } catch (error) {
      // biome-ignore lint/nursery/noConsole: <explanation>
      console.error('Error reading page', error, page);
    }
  });

  return emitter;
};

type PageLines = {
  title: string;
  lines: string[];
};
const englishStartPattern = /^(=+)English=+$/;
const readEnglishDetails = (path: PathLike, filter?: (page: PageText) => boolean) => {
  const emitter = new EventEmitter<{
    page: [PageLines];
    end: [];
  }>();

  const pageEmitter = readPages(path, (page) => {
    if (!page.text.includes('=English=')) {
      return false;
    }
    return filter?.(page) ?? false;
  });

  pageEmitter.on('end', () => emitter.emit('end'));
  pageEmitter.on('page', ({ title, text }) => {
    const lines = text.split('\n');
    let englishEndPattern: RegExp | null = null;
    const englishLines: string[] = [];
    for (const line of lines) {
      if (englishEndPattern) {
        if (englishEndPattern.test(line)) {
          break;
        }
        englishLines.push(line);
      } else {
        const match = line.match(englishStartPattern);
        if (match) {
          const level = match[1].length;
          englishEndPattern = new RegExp(`^={${level}}[^=]+={${level}}$`);
        }
      }
    }
    emitter.emit('page', {
      title,
      lines: englishLines,
    });
  });
  return emitter;
};

export type PageTags = {
  title: string;
  tags: string[][];
};

const types = [
  { lookup: /\{en-adj[}|]/, type: 'adjective' },
  { lookup: /\{en-adv[}|]/, type: 'adverb' },
  { lookup: /\{en-con[}|]/, type: 'conjunction' },
  { lookup: /\{en-det[}|]/, type: 'determiner' },
  { lookup: /\{en-cont[}|]/, type: 'contraction' },
  { lookup: /\{en-interj[}|]/, type: 'interjection' },
  { lookup: /\{en-noun[}|]/, type: 'noun' },
  { lookup: /\{en-part[}|]/, type: 'particle' },
  { lookup: /\{en-prefix[}|]/, type: 'prefix' },
  { lookup: /\{en-prep[}|]/, type: 'preposition' },
  { lookup: /\{en-prep phrase[}|]/, type: 'prepositional phrase' },
  { lookup: /\{en-pron[}|]/, type: 'pronoun' },
  { lookup: /\{en-proper noun[}|]/, type: 'proper noun' },
  { lookup: /\{en-proverb[}|]/, type: 'proverb' },
  { lookup: /\{en-suffix[}|]/, type: 'suffix' },
  { lookup: /\{en-symbol[}|]/, type: 'symbol' },
  { lookup: /\{en-verb[}|]/, type: 'verb' },
  { lookup: /\{en-adj[}|]/, type: 'adjective' },
  { lookup: /\{head\|en\|(a|adj|adjective)[ }|]/, type: 'adjective' },
  { lookup: /\{head\|en\|(adv|adverb)[ }|]/, type: 'adverb' },
  { lookup: /\{head\|en\|(adv|article)[ }|]/, type: 'article' },
  { lookup: /\{head\|en\|(cnum|cardinal number)[ }|]/, type: 'cardinal number' },
  { lookup: /\{head\|en\|(conj|conjunction)[ }|]/, type: 'conjunction' },
  { lookup: /\{head\|en\|(conv|converb)[ }|]/, type: 'converb' },
  { lookup: /\{head\|en\|(det|determiner)[ }|]/, type: 'determiner' },
  { lookup: /\{head\|en\|(int|interjection)[ }|]/, type: 'interjection' },
  { lookup: /\{head\|en\|(interj|interjection)[ }|]/, type: 'interjection' },
  { lookup: /\{head\|en\|(intj|interjection)[ }|]/, type: 'interjection' },
  { lookup: /\{head\|en\|(n|noun)[ }|]/, type: 'noun' },
  { lookup: /\{head\|en\|(num|numeral)[ }|]/, type: 'numeral' },
  { lookup: /\{head\|en\|(onum|ordinal number)[ }|]/, type: 'ordinal number' },
  { lookup: /\{head\|en\|(part|participle)[ }|]/, type: 'participle' },
  { lookup: /\{head\|en\|(pcl|particle)[ }|]/, type: 'particle' },
  { lookup: /\{head\|en\|(phr|phrase)[ }|]/, type: 'phrase' },
  { lookup: /\{head\|en\|(pn|proper noun)[ }|]/, type: 'proper noun' },
  { lookup: /\{head\|en\|(postp|postposition)[ }|]/, type: 'postposition' },
  { lookup: /\{head\|en\|(pre|preposition)[ }|]/, type: 'preposition' },
  { lookup: /\{head\|en\|(prep|preposition)[ }|]/, type: 'preposition' },
  { lookup: /\{head\|en\|(pro|pronoun)[ }|]/, type: 'pronoun' },
  { lookup: /\{head\|en\|(pron|pronoun)[ }|]/, type: 'pronoun' },
  { lookup: /\{head\|en\|(prop|proper noun)[ }|]/, type: 'proper noun' },
  { lookup: /\{head\|en\|(proper|proper noun)[ }|]/, type: 'proper noun' },
  { lookup: /\{head\|en\|(v|verb)[ }|]/, type: 'verb' },
  { lookup: /\{head\|en\|(vb|verb)[ }|]/, type: 'verb' },
  { lookup: /\{head\|en\|(vi|intransitive verb)[ }|]/, type: 'intransitive verb' },
  { lookup: /\{head\|en\|(vt|transitive verb)[ }|]/, type: 'transitive verb' },
  { lookup: /\{head\|en\|(vti|transitive and intransitive verb)[ }|]/, type: 'transitive and intransitive verb' },
] as const;

const tagPattern = /\{{([^}]+)}}/g;
const extractTagsFromLine = (line: string) => {
  const lineCategories: string[] = [];
  const matches = line.matchAll(tagPattern);
  for (const match of matches) {
    if (match) {
      lineCategories.push(match[1]);
    }
  }
  return lineCategories;
};

const extractWordType = (line: string) => {
  let type: string | null = null;
  for (const typeDef of types) {
    if (typeDef.lookup.test(line)) {
      type = typeDef.type;
      break;
    }
  }
  return type;
};

const extractTags = (path: PathLike, filter?: (page: PageText) => boolean) => {
  const emitter = new EventEmitter<{
    page: [PageTags];
    end: [];
  }>();

  const englishEmitter = readEnglishDetails(path, filter);
  englishEmitter.on('end', () => emitter.emit('end'));

  englishEmitter.on('page', ({ title, lines }) => {
    let type: string | null = null;
    const tags: string[][] = [];
    for (const line of lines) {
      if (line.startsWith('{{')) {
        type = extractWordType(line);
        if (!type) {
          type = line;
        }
      }
      if (type && line.startsWith('# ')) {
        tags.push(extractTagsFromLine(line));
      }
    }
    emitter.emit('page', {
      title,
      tags,
    });
  });

  return emitter;
};

export default extractTags;
