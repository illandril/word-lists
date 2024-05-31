import { describe, expect, it } from 'vitest';
import normalizeTag from './normalizeTag';

describe('form of', () => {
  it.each([
    ['bedroom', 'abbreviation of|en|bedroom'],
    ['level', 'abbr of|en|[[level]]'],
    ['light year', 'abbreviation of|en|light year'],
    ['Minecraft', 'abbreviation of|en|Minecraft'],
    ['mitochondrial', 'abbreviation of|en|[[mitochondrial]]'],
    ['mitochondrion or mitochondria', 'abbreviation of|en|[[mitochondrion]] or [[mitochondria]]'],
    ['no problem', 'abbreviation of|en|no problem'],
    ['off', 'abbreviation of|en|off|dot=,'],
  ])('should return "f.abbr|%s" for %j', (word, input) => {
    expect(normalizeTag(input)).toBe(`f.abbr|${word}`);
  });

  it.each([
    ['ct', 'plural of|en|ct'],
    ['updo', 'plural of|en|updo'],
  ])('should return "f.plural|%s" for %j', (word, input) => {
    expect(normalizeTag(input)).toBe(`f.plural|${word}`);
  });

  it.each([
    ['low voltage', 'init of|en|[[low]] [[voltage]]'],
    ['low volume', 'init of|en|[[low]] volume'],
    ['non-binary', 'initialism of|en|non-binary|nocap=1'],
    ['physical health', 'initialism of|en|physical health'],
    ['phonetically', 'init of|en|[[phonetically]]'],
    ['characters per inch', 'init of|en|[[characters per inch]]'],
  ])('should return "f.init|%s" for %j', (word, input) => {
    expect(normalizeTag(input)).toBe(`f.init|${word}`);
  });

  it.each([
    ['have', 'eye dialect of|en|have|nodot=1'],
    ['you', 'eye dialect of|en|you'],
  ])('should return "f.eye|%s" for %j', (word, input) => {
    expect(normalizeTag(input)).toBe(`f.eye|${word}`);
  });

  it.each([
    ['khan', 'archaic form of|en|khan'],
    ['ire', 'archaic spelling of|en|ire'],
  ])('should return "f.archaic|%s" for %j', (word, input) => {
    expect(normalizeTag(input)).toBe(`f.archaic|${word}`);
  });

  it.each([
    ['yell', 'obsolete spelling of|en|yell'],
    ['at', 'obsolete spelling of|en|at'],
    ['buzz', 'obsolete form of|en|buzz'],
  ])('should return "f.obsolete|%s" for %j', (word, input) => {
    expect(normalizeTag(input)).toBe(`f.obsolete|${word}`);
  });

  it.each([
    ['pH', 'misspelling of|en|pH'],
    ["I've", "misspelling of|en|I've"],
    ['car', 'deliberate misspelling of|en|car'],
  ])('should return "f.misspelling|%s" for %j', (word, input) => {
    expect(normalizeTag(input)).toBe(`f.misspelling|${word}`);
  });

  it.each([
    ['PS', 'alternative form of|en|PS|nodot=1'],
    ['cutie', 'alternative spelling of|en|cutie'],
    ['yeah', 'alt sp|en|yeah'],
    ['cogue', 'alt form|en|cogue||wooden vessel for milk'],
  ])('should return "f.alt|%s" for %j', (word, input) => {
    expect(normalizeTag(input)).toBe(`f.alt|${word}`);
  });

  it.each([
    ['by', 'pronunciation spelling of|en|by'],
    ['car', 'pronunciation spelling of|en|car'],
  ])('should return "f.pronunciation|%s" for %j', (word, input) => {
    expect(normalizeTag(input)).toBe(`f.pronunciation|${word}`);
  });

  it.each([
    ['cabinet file', 'clipping of|en|cabinet file'],
    ['calorie', 'clipping of|en|calorie'],
  ])('should return "f.clipping|%s" for %j', (word, input) => {
    expect(normalizeTag(input)).toBe(`f.clipping|${word}`);
  });
});

describe('labels', () => {
  it.each([
    ['stenoscript', 'lb|en|stenoscript'],
    ['obsolete', 'term-label|en|obsolete'],
    ['tip', 'l|en|tip'],
  ])('(singular) should return ["lb|%s"] for %j', (word, input) => {
    expect(normalizeTag(input)).toEqual([`lb|${word}`]);
  });

  it.each([
    [['lb|UK', 'lb|sometimes capitalized'], 'lb|en|UK|sometimes|capitalized'],
    [['lb|very rare', 'lb|nonstandard'], 'lb|en|very|rare|nonstandard'],
    [['lb|jargon', 'lb|social media'], 'lb|en|jargon|social media'],
    [['lb|automotive', 'lb|in classified ads'], 'lb|en|automotive|in [[classified ad]]s'],
    [['lb|Canada', 'lb|dated', 'lb|uncountable'], 'lb|en|Canada|dated|uncountable'],
    [['lb|intransitive', 'lb|UK dialectal'], 'lb|en|intransitive|UK|_|dialectal'],
  ])('(multiples) should return %j for %j', (expected, input) => {
    expect(normalizeTag(input)).toEqual(expected);
  });
});

describe('ignored tags', () => {
  it.each([
    ['non-gloss definition|Expressing distance or motion.'],
    ['non-gloss definition|Expressing separation.'],
    ['non-gloss definition|Introducing subject matter.'],
    ['non-gloss definition|Having {{w|partitive'],
    [
      "ng|and related forms of that word'' ('''[[organized]], [[organizes]], [[organizing]], [[organizer]], [[organizable]], [[organization]], [[organizational]], [[organizationally]]''', ''etc.'')",
    ],
    ['n-g|An exclamation of [[disbelief#Noun|disbelief]] or [[dismissal#Noun|dismissal]].'],
    ['q|often used to indicate the number of plate-based illustrations in a book'],
    ['senseid|en|possession'],
    ['senseid|en|bought item'],
    ['topics|en|Cattle|Male animals'],
    ['topics|en|Cattle'],
    ['taxfmt|Boletus edulis|species'],
  ])('should return null for %j', (input) => {
    expect(normalizeTag(input)).toBeNull();
  });
});
