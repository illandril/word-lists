import { z } from 'zod';

export enum Status {
  Defined = 'Defined',
  Excluded = 'Excluded',
  Undefined = 'Undefined',
  Error = 'Error',
}

const EntriesForLanguage = z.array(
  z.object({
    partOfSpeech: z.string().optional(),
    definitions: z.array(
      z.object({
        definition: z.string().optional(),
        examples: z.array(z.string()).optional(),
      }),
    ),
  }),
);
const DefinitionResponse = z.record(EntriesForLanguage.optional());
type EntriesForLanguage = z.infer<typeof EntriesForLanguage>;

const excludedFragments = ['Alternative form of ', 'Alternative spelling of '] as const;

const excludedCategories = new Set([
  'English_dated_forms',
  'English_obsolete_forms',
  'English_archaic_forms',
  'Early_Modern_English',
  'English_nonstandard_forms',
  'English_short_forms',

  'Appalachian_English',
  'Multicultural_London_English',

  'English_given_names',

  'English_euphemisms',
  'en:Recreational_drugs',
  'en:Furry_fandom',

  'English_initialisms',
  'English_acronyms',

  'English_short_forms',
  'English_ellipses',

  'English_eye_dialect',
  'English_pronunciation_spellings',

  'English_misspellings',
  'English_intentional_misspellings',

  'English_abbreviations',

  'Requests_for_verification_in_English_entries',
]);

const isAllowedDefinition = (definition: string) => {
  for (const fragment of excludedFragments) {
    if (definition.includes(fragment)) {
      return false;
    }
  }
  const matches = definition.matchAll(/rel="mw:PageProp\/Category" href="\.\/Category:([^#"]+)(#[^"]+)?"/g);
  const categoriesForDefinition = [...matches].map((match) => match[1]);
  if (categoriesForDefinition.length) {
    for (const category of categoriesForDefinition) {
      if (excludedCategories.has(category)) {
        return false;
      }
    }
  }
  return true;
};

const includesAllowedEntry = (entries: EntriesForLanguage) => {
  for (const entry of entries) {
    if (!entry.definitions?.length) {
      continue;
    }
    for (const { definition } of entry.definitions) {
      if (definition && isAllowedDefinition(definition)) {
        return true;
      }
    }
  }
  return false;
};

const lookup = async (word: string) => {
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
      return Status.Undefined;
    }
    if (!resp.ok) {
      throw new Error(`Unexpected response: ${resp.status}`);
    }
    const response = DefinitionResponse.parse(await resp.json());

    if (!response.en?.length) {
      // No English definitions
      return Status.Undefined;
    }

    return includesAllowedEntry(response.en) ? Status.Defined : Status.Excluded;
  } catch (e) {
    // biome-ignore lint/nursery/noConsole: Debuging
    console.error('Error checking definition', e);
    return Status.Error;
  }
};

export default lookup;
