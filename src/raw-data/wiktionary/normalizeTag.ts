const ignoreTagMatchers: RegExp[] = [
  /^senseid\|/,
  /^non-gloss definition\|/,
  /^ng\|/,
  /^n-g\|/,
  /^topics\|/,
  /^categorize\|/,
  /^catlangname\|/,
  /^cln\|/,
  /^cat\|/,
  /^C\|/,
  /^q\|/,
  /^qualifier\|/,
  /^taxfmt\|/,
];

const formOfMatchers: [RegExp, string][] = [
  [/^abbr(?:ev|eviation)? of\|en\|([^|]+)/, 'abbr'],

  [/^plural of\|en\|([^|]+)/, 'plural'],

  [/^init(?:ialism)? of\|en\|([^|]+)/, 'init'],

  [/^alt(?:ernative) (?:form|spelling) of\|en\|([^|]+)/, 'alt'],
  [/^alt ?(?:form|sp)\|en\|([^|]+)/, 'alt'],

  [/^eye dialect of\|en\|([^|]+)/, 'eye'],

  [/^(?:deliberate )?misspelling of\|en\|([^|]+)/, 'misspelling'],
  [/^archaic (?:form|spelling) of\|en\|([^|]+)/, 'archaic'],
  [/^obsolete (?:form|spelling) of\|en\|([^|]+)/, 'obsolete'],

  [/^clipping of\|en\|([^|]+)/, 'clipping'],

  [/^pronunciation spelling of\|en\|([^|]+)/, 'pronunciation'],
];

const labelPrefixes = ['lb|en|', 'term-label|en|', 'label|en|', 'l|en|'];
type Qualifier = string | [string, string];
const labelJoiners: Qualifier[] = [
  ['&', 'and'],
  ['+', 'with'],
  '-',
  '–',
  '—',
  ':',
  ';',
  ['_', ''],
  'and',
  'by',
  'except',
  ['except in', 'outside'],
  'or',
  'outside',
  'with',
];
const labelQualifiers: Qualifier[] = [
  'also',
  'attested in',
  'chiefly',
  ['commonly', 'often'],
  'especially',
  'excluding',
  'extremely',
  'frequently',
  'highly',
  'in',
  'including',
  ['mainly', 'chiefly'],
  'many',
  'markedly',
  'mildly',
  ['mostly', 'chiefly'],
  'now',
  ['nowadays', 'now'],
  'occasionally',
  'of',
  ['of a', 'of'],
  ['of an', 'of'],
  'often',
  'originally',
  'otherwise',
  'particularly',
  'possibly',
  ['primarily', 'chiefly'],
  'rarely',
  'rather',
  'relatively',
  'slightly',
  'sometimes',
  'somewhat',
  'strongly',
  'then',
  'typically',
  'usually',
  'very',
  'with respect to',
  ['wrt', 'with respect to'],
];

const normalizeQualifier = (label: string, qualifiers: Qualifier[]) => {
  const lowerLabel = label.toLowerCase();
  for (const qualifier of qualifiers) {
    if (Array.isArray(qualifier)) {
      if (lowerLabel === qualifier[0]) {
        return qualifier[1];
      }
    } else if (lowerLabel === qualifier) {
      return qualifier;
    }
  }
  return null;
};

const normalizeLabels = (labelParts: string[]): string[] => {
  const labels: string[] = [];
  let appendNext = false;
  for (const part of labelParts) {
    let label = part;
    const joiner = normalizeQualifier(part, labelJoiners);
    if (joiner !== null) {
      label = joiner;
      appendNext = true;
    }
    if (appendNext) {
      if (label) {
        labels[labels.length - 1] = `${labels[labels.length - 1]} ${label}`;
      }
      appendNext = joiner !== null;
    } else {
      const qualifier = normalizeQualifier(part, labelQualifiers);
      if (qualifier !== null) {
        appendNext = true;
        label = qualifier;
      }
      labels.push(label);
    }
  }
  return labels.map((lb) => `lb|${lb}`);
};

const normalizeTag = (rawTag: string): null | string | string[] => {
  const tag = rawTag.replaceAll(/[\[\]]/g, '');
  for (const matcher of ignoreTagMatchers) {
    if (matcher.test(tag)) {
      return null;
    }
  }
  for (const labelPrefix of labelPrefixes) {
    if (tag.startsWith(labelPrefix)) {
      return normalizeLabels(tag.substring(labelPrefix.length).split('|'));
    }
  }
  for (const [formOfMatcher, formOf] of formOfMatchers) {
    const match = tag.match(formOfMatcher);
    if (match?.length) {
      return `f.${formOf}|${match[1].replaceAll(/[\[\]]/g, '')}`;
    }
  }
  return tag;
};

export default normalizeTag;
