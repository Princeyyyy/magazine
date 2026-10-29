import { z } from "zod";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

// ============================================================================
// PHOTO UPLOAD CONSTANTS
// ============================================================================
export const PHOTO_UPLOAD_CONFIG = {
  acceptedExtensions: [".jpg", ".jpeg", ".png", ".heic", ".heif"] as const,
  acceptedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/heic",
    "image/heif",
  ] as const,
  minFiles: 15,
  maxFiles: 30,
  maxFileSizeBytes: 15 * 1024 * 1024, // 15 MB
  maxFileSizeMB: 15,
  friendlyMinMessage: "A few more photos will make the magazine shine",
} as const;

// ============================================================================
// GENDER & PRONOUN ADAPTATION SYSTEM
// ============================================================================
export type SubjectGender = "Female" | "Male" | "Other";

export interface PronounTokens {
  subj: string; // she / he / they
  Subj: string; // She / He / They
  obj: string; // her / him / them
  Obj: string; // Her / Him / Them
  poss: string; // her / his / their
  Poss: string; // Her / His / Their
  possPronoun: string; // hers / his / theirs
  refl: string; // herself / himself / themselves
  isPluralVerb: boolean; // true for "they"
}

export function getPronounTokens(gender?: string | unknown): PronounTokens {
  if (gender === "Male") {
    return {
      subj: "he",
      Subj: "He",
      obj: "him",
      Obj: "Him",
      poss: "his",
      Poss: "His",
      possPronoun: "his",
      refl: "himself",
      isPluralVerb: false,
    };
  }
  if (gender === "Other") {
    return {
      subj: "they",
      Subj: "They",
      obj: "them",
      Obj: "Them",
      poss: "their",
      Poss: "Their",
      possPronoun: "theirs",
      refl: "themselves",
      isPluralVerb: true,
    };
  }
  // Default: Female
  return {
    subj: "she",
    Subj: "She",
    obj: "her",
    Obj: "Her",
    poss: "her",
    Poss: "Her",
    possPronoun: "hers",
    refl: "herself",
    isPluralVerb: false,
  };
}

/**
 * Dynamically adapts any UI copy, page title, group title, field label, placeholder,
 * or help text based on the selected gender ("Female" | "Male" | "Other").
 */
export function adaptCopyByGender(
  text: string | undefined,
  gender?: string | unknown
): string {
  if (!text) return "";
  if (!gender || gender === "Female") return text;

  const p = getPronounTokens(gender);

  // Ordered phrase replacements so verbs and case-sensitive pronouns transform cleanly
  const phraseRules: Array<[RegExp, string]> = [
    // Title / Heading phrases
    [/\bAbout Her\b/g, `About ${p.Obj}`],
    [/\bAbout her\b/g, `About ${p.obj}`],
    [/\bHer Favourites\b/g, `${p.Poss} Favourites`],
    [/\bHer in lists\b/g, `${p.Obj} in lists`],
    [/\bWho she is\b/g, p.isPluralVerb ? "Who they are" : `Who ${p.subj} is`],
    [/\bWhat does she mean to you\?/g, p.isPluralVerb ? "What do they mean to you?" : `What does ${p.subj} mean to you?`],
    [/\bWhat she means to you\b/g, p.isPluralVerb ? "What they mean to you" : `What ${p.subj} means to you`],
    [/\b10 things she loves doing\b/g, p.isPluralVerb ? "10 things they love doing" : `10 things ${p.subj} loves doing`],
    [/\bActivity she loves\b/g, p.isPluralVerb ? "Activity they love" : `Activity ${p.subj} loves`],
    [/\bWhy she loves it\b/g, p.isPluralVerb ? "Why they love it" : `Why ${p.subj} loves it`],
    [/\bDescribe a few looks she wore\b/g, `Describe a few looks ${p.subj} wore`],
    [/\bHow does she dress\?/g, p.isPluralVerb ? "How do they dress?" : `How does ${p.subj} dress?`],
    [/\bWhat she always carries in her bag\b/g, p.isPluralVerb ? "What they always carry in their bag" : `What ${p.subj} always carries in ${p.poss} bag`],
    [/\bpieces she has her eye on\b/g, p.isPluralVerb ? "pieces they have their eye on" : `pieces ${p.subj} has ${p.poss} eye on`],
    [/\bSongs that are her\b/g, `Songs that are ${p.obj}`],
    [/\bThe age she is turning\b/g, p.isPluralVerb ? "The age they are turning" : `The age ${p.subj} is turning`],
    [/\bWhat is she building\b/g, p.isPluralVerb ? "What are they building" : `What is ${p.subj} building`],
    [/\bthe way she lights up a room\b/g, p.isPluralVerb ? "the way they light up a room" : `the way ${p.subj} lights up a room`],
    [/\bThe way she remembers\b/g, p.isPluralVerb ? "The way they remember" : `The way ${p.subj} remembers`],
    [/\bpastimes she adores\b/g, p.isPluralVerb ? "pastimes they adore" : `pastimes ${p.subj} adores`],
    [/\bseries she quotes\b/g, p.isPluralVerb ? "series they quote" : `series ${p.subj} quotes`],
    [/\brituals she swears by\b/g, p.isPluralVerb ? "rituals they swear by" : `rituals ${p.subj} swears by`],
    [/\bunmistakably hers\b/g, `unmistakably ${p.possPronoun}`],
    [/\bin her own words\b/g, `in ${p.poss} own words`],
    // Object usages of "her" (after prepositions/verbs)
    [/\bto her\b/g, `to ${p.obj}`],
    [/\babout her\b/g, `about ${p.obj}`],
    [/\bdescribe her\b/g, `describe ${p.obj}`],
    [/\bmakes her\b/g, `makes ${p.obj}`],
    [/\bcall her\b/g, `call ${p.obj}`],
    [/\bof her\b/g, `of ${p.obj}`],
    [/\bfor her\b/g, `for ${p.obj}`],
    // Remaining "she" / "She"
    [/\bShe\b/g, p.Subj],
    [/\bshe\b/g, p.subj],
    // Remaining possessive "Her" / "her"
    [/\bHer\b/g, p.Poss],
    [/\bher\b/g, p.poss],
  ];

  let out = text;
  for (const [pattern, replacement] of phraseRules) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Ensures the first letter of a non-empty text string is capitalized automatically.
 */
export function autoCapitalizeFirst(val: string): string {
  if (!val) return val;
  const firstLetterIdx = val.search(/[a-zA-Z]/);
  if (firstLetterIdx === 0) {
    return val.charAt(0).toUpperCase() + val.slice(1);
  }
  return val;
}

// ============================================================================
// FORM FIELD TYPES & DEFINITIONS
// ============================================================================
export type FieldType =
  | "shortText"
  | "longText"
  | "number"
  | "date"
  | "radio"
  | "email"
  | "phone"
  | "checkbox"
  | "repeatableRows"
  | "photoUpload";

export interface ConditionalRule {
  fieldKey: string;
  equals: string | boolean | number;
  requiredWhenShown?: boolean;
}

export interface SubFieldConfig {
  key: string;
  label: string;
  placeholder?: string;
  maxLength: number;
  type?: "shortText" | "longText";
}

export interface BaseFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  errorMessage?: string;
  conditional?: ConditionalRule;
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: "shortText" | "longText";
  minLength?: number;
  maxLength: number;
}

export interface NumberFieldConfig extends BaseFieldConfig {
  type: "number";
  min: number;
  max: number;
  wholeNumber?: boolean;
}

export interface DateFieldConfig extends BaseFieldConfig {
  type: "date";
}

export interface RadioFieldConfig extends BaseFieldConfig {
  type: "radio";
  options: readonly string[];
}

export interface EmailFieldConfig extends BaseFieldConfig {
  type: "email";
}

export interface PhoneFieldConfig extends BaseFieldConfig {
  type: "phone";
  defaultCountry: CountryCode;
}

export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: "checkbox";
  checkboxLabel: string;
}

export interface RepeatableRowsFieldConfig extends BaseFieldConfig {
  type: "repeatableRows";
  subFields: readonly SubFieldConfig[];
  initialRows: number;
  minRows: number; // hard minimum filled rows
  maxRows: number;
  targetHint?: string; // e.g., "Target: 6 to 10 items"
}

export interface PhotoUploadFieldConfig extends BaseFieldConfig {
  type: "photoUpload";
  minPhotos: number;
  maxPhotos: number;
  maxSizeBytes: number;
}

export type FieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | DateFieldConfig
  | RadioFieldConfig
  | EmailFieldConfig
  | PhoneFieldConfig
  | CheckboxFieldConfig
  | RepeatableRowsFieldConfig
  | PhotoUploadFieldConfig;

export interface GroupConfig {
  id: string;
  title: string;
  description?: string;
  fields: readonly FieldConfig[];
}

export interface PageConfig {
  id: string;
  pageNumber: number;
  title: string;
  subtitle: string;
  groups: readonly GroupConfig[];
}

// ============================================================================
// COMPLETE 9-PAGE MAGAZINE FORM CONFIGURATION
// ============================================================================
export const FORM_PAGES: readonly PageConfig[] = [
  // --------------------------------------------------------------------------
  // PAGE 1: Order Details
  // --------------------------------------------------------------------------
  {
    id: "order-details",
    pageNumber: 1,
    title: "Order Details",
    subtitle: "The cover and the basics",
    groups: [
      {
        id: "about-you",
        title: "About you",
        fields: [
          {
            key: "customer_name",
            label: "Your name",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 100,
            placeholder: "Your full name",
            errorMessage: "Please enter your name so I know who is creating this issue.",
          },
          {
            key: "relationship",
            label: "Your relationship to this person",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 50,
            placeholder: "e.g. Best friend, sister, partner",
            errorMessage: "Please share your relationship to this person.",
          },
        ],
      },
      {
        id: "about-her",
        title: "About her",
        fields: [
          {
            key: "subject_gender",
            label: "Who is this magazine about?",
            type: "radio",
            required: true,
            options: ["Female", "Male", "Other"],
            helpText: "I will tailor all questions and pronouns throughout the rest of the brief.",
            errorMessage: "Please select who this magazine is about.",
          },
          {
            key: "her_name",
            label: "Her full name",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 100,
            placeholder: "First and last name",
            errorMessage: "Please enter her full name for the cover and masthead.",
          },
          {
            key: "her_nickname",
            label: "Her nickname",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 50,
            placeholder: "What do her favourite people call her?",
            errorMessage: "Please enter her nickname (or what people call her).",
          },
          {
            key: "birthday_date",
            label: "Her birthday date",
            type: "date",
            required: true,
            errorMessage: "Please select her birthday date.",
          },
          {
            key: "age_turning",
            label: "The age she is turning",
            type: "number",
            required: true,
            min: 1,
            max: 120,
            wholeNumber: true,
            placeholder: "e.g. 25",
            errorMessage: "Please enter a whole number between 1 and 120.",
          },
        ],
      },
      {
        id: "look-of-magazine",
        title: "The look of the magazine",
        fields: [
          {
            key: "colour_theme",
            label: "Colour theme",
            type: "radio",
            required: true,
            options: [
              "Pink and girly",
              "Black and white",
              "Neutral and minimal",
              "Bright and colourful",
              "Other",
            ],
            errorMessage: "Please choose a colour direction for the magazine.",
          },
          {
            key: "other_colour_theme",
            label: "Other colour theme",
            type: "shortText",
            required: false,
            maxLength: 50,
            placeholder: "Describe the colour palette you have in mind",
            conditional: {
              fieldKey: "colour_theme",
              equals: "Other",
              requiredWhenShown: true,
            },
            errorMessage: "Please describe your custom colour theme.",
          },
          {
            key: "cover_headline",
            label: "Cover headline",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 60,
            placeholder: "e.g. Turning 25 in Style",
            errorMessage: "Please enter a cover headline.",
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // PAGE 2: About Her
  // --------------------------------------------------------------------------
  {
    id: "about-her-page",
    pageNumber: 2,
    title: "About Her",
    subtitle: "Her feature story",
    groups: [
      {
        id: "your-story-together",
        title: "Your story together",
        fields: [
          {
            key: "how_did_you_meet",
            label: "How did you meet?",
            type: "longText",
            required: true,
            minLength: 2,
            maxLength: 1000,
            placeholder: "Tell the story of how your paths first crossed...",
            errorMessage: "Please share how you first met.",
          },
          {
            key: "how_long_known",
            label: "How long have you known each other?",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 100,
            placeholder: "e.g. Since primary school, 7 years, since 2019",
            errorMessage: "Please share how long you have known each other.",
          },
          {
            key: "what_she_means_to_you",
            label: "What does she mean to you?",
            type: "longText",
            required: true,
            minLength: 20,
            maxLength: 1500,
            placeholder:
              "Pour your heart out — what makes your bond so special? (At least 20 characters)",
            errorMessage:
              "Please write at least 20 characters about what she means to you for her feature story.",
          },
        ],
      },
      {
        id: "who-she-is",
        title: "Who she is",
        fields: [
          {
            key: "three_words_describe_her",
            label: "Three words that describe her",
            type: "shortText",
            required: true,
            maxLength: 80,
            placeholder: "e.g. Radiant, fiercely loyal, effortlessly chic",
            errorMessage: "Please share three words that capture her spirit.",
          },
          {
            key: "what_makes_her_different",
            label: "What makes her different from everyone else you know?",
            type: "longText",
            required: true,
            minLength: 2,
            maxLength: 1000,
            placeholder: "Her signature quirks, her warmth, the way she lights up a room...",
            errorMessage: "Please share what makes her different from everyone else.",
          },
          {
            key: "her_job_studies_passions",
            label: "Her job, studies or passions",
            type: "longText",
            required: true,
            minLength: 2,
            maxLength: 1000,
            placeholder: "What is she building, studying, or deeply passionate about right now?",
            errorMessage: "Please share her job, studies, or passions.",
          },
        ],
      },
      {
        id: "her-in-lists",
        title: "Her in lists",
        fields: [
          {
            key: "nine_things_loved",
            label: "9 things you love about her, one short sentence each",
            type: "repeatableRows",
            required: true,
            initialRows: 3, // Start by showing the minimum (3) and allow adding up to 9
            minRows: 3,
            maxRows: 9,
            targetHint: "Start with 3 (add up to 9)",
            subFields: [
              {
                key: "sentence",
                label: "Something you love about her",
                placeholder: "e.g. The way she remembers everyone's coffee order",
                maxLength: 160,
              },
            ],
            errorMessage: "Please fill in at least 3 things you love about her.",
          },
          {
            key: "ten_things_she_loves_doing",
            label: "10 things she loves doing",
            type: "repeatableRows",
            required: true,
            initialRows: 3,
            minRows: 3,
            maxRows: 10,
            targetHint: "Start with 3 (add up to 10 little rituals or pastimes she adores)",
            subFields: [
              {
                key: "activity",
                label: "Activity she loves",
                placeholder: "e.g. Sunday morning pilates followed by iced matcha",
                maxLength: 100,
              },
            ],
            errorMessage: "Please add at least 3 things she loves doing.",
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // PAGE 3: Her Favourites
  // --------------------------------------------------------------------------
  {
    id: "her-favourites",
    pageNumber: 3,
    title: "Her Favourites",
    subtitle: "The favourites spread",
    groups: [
      {
        id: "food-and-drink",
        title: "Food and drink",
        fields: [
          {
            key: "favourite_drink",
            label: "Favourite drink",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 100,
            placeholder: "e.g. Vanilla oat latte or spicy margarita",
            errorMessage: "Please share her favourite drink.",
          },
          {
            key: "favourite_sweet_treat",
            label: "Favourite sweet treat",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 100,
            placeholder: "e.g. Pistachio gelato, tiramisu, dark chocolate",
            errorMessage: "Please share her favourite sweet treat.",
          },
          {
            key: "favourite_meal",
            label: "Favourite meal",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 100,
            placeholder: "e.g. Truffle pasta, sushi platter, mum's biriani",
            errorMessage: "Please share her favourite meal.",
          },
        ],
      },
      {
        id: "travel-and-hobbies",
        title: "Travel and hobbies",
        fields: [
          {
            key: "dream_destination",
            label: "Dream destination",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 100,
            placeholder: "e.g. Amalfi Coast, Kyoto, Zanzibar",
            errorMessage: "Please share her dream destination.",
          },
          {
            key: "favourite_beach_or_holiday_spot",
            label: "Favourite beach or holiday spot",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 100,
            placeholder: "e.g. Diani Beach, Lamu, Cape Town",
            errorMessage: "Please share her favourite beach or holiday spot.",
          },
          {
            key: "favourite_hobby",
            label: "Favourite hobby",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 100,
            placeholder: "e.g. Hosting dinner parties, pottery, solo travel",
            errorMessage: "Please share her favourite hobby.",
          },
        ],
      },
      {
        id: "flowers-colours-books",
        title: "Flowers, colours and books",
        fields: [
          {
            key: "favourite_flowers",
            label: "Favourite flowers",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 100,
            placeholder: "e.g. Blush peonies, white lilies, sunflowers",
            errorMessage: "Please share her favourite flowers.",
          },
          {
            key: "favourite_colours",
            label: "Favourite colours",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 100,
            placeholder: "e.g. Butter yellow, espresso brown, soft rose",
            errorMessage: "Please share her favourite colours.",
          },
          {
            key: "favourite_book_or_genre",
            label: "Favourite book or genre",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 100,
            placeholder: "e.g. Everything I Know About Love, literary fiction",
            errorMessage: "Please share her favourite book or genre.",
          },
          {
            key: "favourite_film_genre",
            label: "Favourite film genre",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 100,
            placeholder: "e.g. 2000s rom-coms, psychological thrillers, period dramas",
            errorMessage: "Please share her favourite film genre.",
          },
        ],
      },
      {
        id: "on-screen",
        title: "On screen",
        fields: [
          {
            key: "top_movies",
            label: "4 Favourite movies",
            type: "repeatableRows",
            required: true,
            initialRows: 4,
            minRows: 4,
            maxRows: 4,
            targetHint: "4 favourite films or comfort movies (all 4 required)",
            subFields: [
              {
                key: "title",
                label: "Movie title",
                placeholder: "e.g. The Devil Wears Prada",
                maxLength: 100,
              },
            ],
            errorMessage: "Please enter all 4 favourite movies.",
          },
          {
            key: "top_series",
            label: "4 Favourite TV series",
            type: "repeatableRows",
            required: true,
            initialRows: 4,
            minRows: 4,
            maxRows: 4,
            targetHint: "4 comfort rewatches or series she quotes (all 4 required)",
            subFields: [
              {
                key: "title",
                label: "Series title",
                placeholder: "e.g. Gilmore Girls, Succession",
                maxLength: 100,
              },
            ],
            errorMessage: "Please enter all 4 favourite TV series.",
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // PAGE 4: Beauty
  // --------------------------------------------------------------------------
  {
    id: "beauty",
    pageNumber: 4,
    title: "Beauty",
    subtitle: "Her beauty edit",
    groups: [
      {
        id: "scent",
        title: "Scent",
        fields: [
          {
            key: "top_3_perfumes",
            label: "Her top 3 perfumes, and why",
            type: "repeatableRows",
            required: true,
            initialRows: 1,
            minRows: 1,
            maxRows: 3,
            targetHint: "1 to 3 signature scents (at least 1 required)",
            subFields: [
              {
                key: "perfume_name",
                label: "Perfume name",
                placeholder: "e.g. Maison Francis Kurkdjian Baccarat Rouge 540",
                maxLength: 80,
              },
              {
                key: "why",
                label: "Why she loves it / the memory it holds",
                placeholder: "e.g. Her date-night signature that everyone compliments",
                maxLength: 200,
              },
            ],
            errorMessage: "Please share at least 1 signature perfume.",
          },
        ],
      },
      {
        id: "makeup",
        title: "Makeup",
        fields: [
          {
            key: "signature_lip_combo",
            label: "Her signature lip combo",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 150,
            placeholder: "e.g. MAC Chestnut liner with Fenty Gloss Bomb",
            errorMessage: "Please share her signature lip combo (or favourite lip product).",
          },
        ],
      },
      {
        id: "skin-and-hair",
        title: "Skin and hair",
        fields: [
          {
            key: "skincare_or_hair_favourites",
            label: "Her skincare or hair favourites",
            type: "longText",
            required: true,
            minLength: 2,
            maxLength: 800,
            placeholder: "The serums, masks, oils, or salon rituals she swears by...",
            errorMessage: "Please share her skincare or hair favourites.",
          },
        ],
      },
      {
        id: "beauty-bag",
        title: "Beauty bag",
        fields: [
          {
            key: "favourite_beauty_products",
            label: "Her favourite beauty products",
            type: "longText",
            required: true,
            minLength: 2,
            maxLength: 800,
            placeholder: "Blush, highlighter, setting spray, brow gel — her holy grail edit...",
            errorMessage: "Please share her favourite beauty products.",
          },
        ],
      },
      {
        id: "outfits",
        title: "Outfits",
        fields: [
          {
            key: "favourite_outfits",
            label: "Her favourite outfits",
            type: "longText",
            required: true,
            minLength: 2,
            maxLength: 800,
            placeholder: "Describe a few looks she wore that were pure perfection...",
            errorMessage: "Please describe a few of her favourite outfits.",
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // PAGE 5: Style and Wishlist
  // --------------------------------------------------------------------------
  {
    id: "style-and-wishlist",
    pageNumber: 5,
    title: "Style and Wishlist",
    subtitle: "Her fashion pages",
    groups: [
      {
        id: "her-style",
        title: "Her style",
        fields: [
          {
            key: "her_style_in_her_own_words",
            label: "Her style, in her own words",
            type: "longText",
            required: true,
            minLength: 2,
            maxLength: 800,
            placeholder: "How does she dress? Tailored minimal, soft romantic, street luxe?",
            errorMessage: "Please describe her style in a few words.",
          },
          {
            key: "favourite_brands",
            label: "Her favourite brands",
            type: "longText",
            required: true,
            minLength: 2,
            maxLength: 500,
            placeholder: "Fashion houses, local designers, jewellery labels, or high-street staples...",
            errorMessage: "Please share her favourite brands.",
          },
          {
            key: "goto_outfit_essential",
            label: "Her go-to outfit essential",
            type: "shortText",
            required: true,
            minLength: 2,
            maxLength: 150,
            placeholder: "e.g. Gold hoops, oversized blazer, pointed slingbacks",
            errorMessage: "Please share her go-to outfit essential.",
          },
        ],
      },
      {
        id: "her-bag",
        title: "Her bag",
        fields: [
          {
            key: "what_she_carries_in_bag",
            label: "What she always carries in her bag",
            type: "longText",
            required: true,
            minLength: 2,
            maxLength: 800,
            placeholder: "e.g. Jewellery, watches, glasses, shoes, bag brand",
            errorMessage: "Please share what she always carries in her bag.",
          },
        ],
      },
      {
        id: "her-wishlist",
        title: "Her wishlist",
        fields: [
          {
            key: "wishlist",
            label: "Wishlist",
            type: "repeatableRows",
            required: true,
            initialRows: 1,
            minRows: 1,
            maxRows: 10,
            targetHint: "Target: pieces she has her eye on (at least 1 required)",
            subFields: [
              {
                key: "item",
                label: "Item",
                placeholder: "e.g. Leather shoulder bag",
                maxLength: 100,
              },
              {
                key: "brand_colour_model",
                label: "Brand, colour or model",
                placeholder: "e.g. Polène Numéro Dix in Camel",
                maxLength: 100,
              },
            ],
            errorMessage: "Please add at least 1 wishlist item.",
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // PAGE 6: Music and Movies
  // --------------------------------------------------------------------------
  {
    id: "music-and-movies",
    pageNumber: 6,
    title: "Music and Movies",
    subtitle: "Her playlist page",
    groups: [
      {
        id: "songs-that-are-her",
        title: "Songs that are her",
        fields: [
          {
            key: "songs",
            label: "Songs",
            type: "repeatableRows",
            required: true,
            initialRows: 3, // Start with minimum 3 and allow adding up to 8
            minRows: 3,
            maxRows: 8,
            targetHint: "Target: 5 to 8 tracks (minimum 3 required)",
            subFields: [
              {
                key: "song_title",
                label: "Song title",
                placeholder: "e.g. Love on Top",
                maxLength: 100,
              },
              {
                key: "artist",
                label: "Artist",
                placeholder: "e.g. Beyoncé",
                maxLength: 100,
              },
            ],
            errorMessage: "Please add at least 3 songs (with both song title and artist) for her playlist page.",
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // PAGE 7: Memories
  // --------------------------------------------------------------------------
  {
    id: "memories",
    pageNumber: 7,
    title: "Memories",
    subtitle: "Memory lane",
    groups: [
      {
        id: "moments-shared",
        title: "Moments you've shared",
        fields: [
          {
            key: "key_moments",
            label: "Key moments",
            type: "repeatableRows",
            required: true,
            initialRows: 3, // Start with minimum 3 and allow adding up to 8
            minRows: 3,
            maxRows: 8,
            targetHint: "Target: 5 to 8 memories (minimum 3 required)",
            helpText: "First meeting, trips, birthdays, hard times and more",
            subFields: [
              {
                key: "date",
                label: "Date",
                placeholder: "e.g. June 2019",
                maxLength: 60,
              },
              {
                key: "place",
                label: "Place",
                placeholder: "e.g. Nairobi / Zanzibar",
                maxLength: 100,
              },
              {
                key: "what_happened",
                label: "What happened",
                placeholder: "Tell the story of this memory...",
                maxLength: 300,
                type: "longText",
              },
            ],
            errorMessage:
              "Please share at least 3 key moments (including date, place, and what happened).",
          },
        ],
      },
      {
        id: "her-most-iconic",
        title: "Her most iconic",
        fields: [
          {
            key: "funniest_or_most_iconic_moment",
            label: "Her funniest or most iconic moment",
            type: "longText",
            required: true,
            minLength: 2,
            maxLength: 1000,
            placeholder: "The story that always gets told when everyone is around the table...",
            errorMessage: "Please share her funniest or most iconic moment.",
          },
          {
            key: "inside_jokes_and_catchphrases",
            label: "Inside jokes and catchphrases",
            type: "longText",
            required: true,
            minLength: 2,
            maxLength: 1000,
            placeholder: "The words, voice notes, or one-liners that are unmistakably hers...",
            errorMessage: "Please share inside jokes or catchphrases.",
          },
        ],
      },
      {
        id: "looking-ahead",
        title: "Looking ahead",
        fields: [
          {
            key: "hopes_and_wishes",
            label: "Your hopes and wishes for her new year",
            type: "longText",
            required: true,
            minLength: 2,
            maxLength: 1000,
            placeholder: "What are you wishing for her in this next chapter?",
            errorMessage: "Please share your hopes and wishes for her new year.",
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // PAGE 8: Photos
  // --------------------------------------------------------------------------
  {
    id: "photos",
    pageNumber: 8,
    title: "Photos",
    subtitle: "Her photo spreads",
    groups: [
      {
        id: "upload",
        title: "Upload",
        fields: [
          {
            key: "photos",
            label: "Magazine photos",
            type: "photoUpload",
            required: true,
            minPhotos: PHOTO_UPLOAD_CONFIG.minFiles,
            maxPhotos: PHOTO_UPLOAD_CONFIG.maxFiles,
            maxSizeBytes: PHOTO_UPLOAD_CONFIG.maxFileSizeBytes,
            helpText:
              "Send 15 to 30 clear photos of her: selfies, candids, group shots, trips. Send as many as you have. Clear, high quality photos make the best pages.",
            errorMessage: PHOTO_UPLOAD_CONFIG.friendlyMinMessage,
          },
          {
            key: "photo_link_fallback",
            label: "Photo link fallback",
            type: "shortText",
            required: false,
            maxLength: 500,
            placeholder: "Optional Google Drive or WeTransfer link if you have extra photos",
            helpText:
              "For customers who cannot upload everything directly, paste a shared folder link here.",
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------------------------
  // PAGE 9: Final Details
  // --------------------------------------------------------------------------
  {
    id: "final-details",
    pageNumber: 9,
    title: "Final Details",
    subtitle: "Her letters page",
    groups: [
      {
        id: "messages-from-loved-ones",
        title: "Messages from loved ones",
        fields: [
          {
            key: "messages_from_loved_ones",
            label: "Messages from other friends or family",
            type: "repeatableRows",
            required: false,
            initialRows: 1, // Start with 1 and allow adding up to 15
            minRows: 0,
            maxRows: 15,
            targetHint: "Optional: include notes from up to 15 friends or family members",
            subFields: [
              {
                key: "name",
                label: "Name & relationship",
                placeholder: "e.g. Auntie Grace / Chloe (Uni bestie)",
                maxLength: 80,
              },
              {
                key: "note",
                label: "Their message for her",
                placeholder: "Write their tribute or letter here...",
                maxLength: 400,
                type: "longText",
              },
            ],
          },
        ],
      },
    ],
  },
] as const;

// ============================================================================
// PHONE NORMALISATION HELPER
// ============================================================================
export function normalizePhoneToE164(
  rawPhone: string,
  defaultCountry: CountryCode = "KE"
): { valid: true; e164: string } | { valid: false; error: string } {
  const trimmed = rawPhone.trim();
  if (!trimmed) {
    return { valid: false, error: "Phone number is required." };
  }

  try {
    const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
    if (!parsed || !parsed.isValid()) {
      return {
        valid: false,
        error: "Please enter a valid phone number in international format.",
      };
    }
    return { valid: true, e164: parsed.number };
  } catch {
    return {
      valid: false,
      error: "Please enter a valid phone number in international format.",
    };
  }
}

// ============================================================================
// PHOTO ITEM SCHEMA
// ============================================================================
export const uploadedPhotoItemSchema = z.object({
  id: z.string().min(1),
  storageProvider: z.enum(["local", "drive"]),
  storageFileId: z.string().min(1),
  originalName: z.string().min(1),
  mime: z.string().min(1),
  sizeBytes: z.number().int().positive().max(PHOTO_UPLOAD_CONFIG.maxFileSizeBytes),
  caption: z.string().max(200).default(""),
  isCover: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
  previewUrl: z.string().optional(),
});

export type UploadedPhotoItem = z.infer<typeof uploadedPhotoItemSchema>;

// ============================================================================
// VALIDATION HELPERS FOR ACCURATE DATA
// ============================================================================
const MEANINGFUL_TEXT_REGEX = /[a-zA-Z0-9\u00C0-\u024F]/;
const STRICT_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidCalendarDate(dateStr: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  const maxDays = new Date(year, month, 0).getDate();
  return day >= 1 && day <= maxDays;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

// ============================================================================
// DYNAMIC ZOD SCHEMA GENERATOR FROM FORM CONFIG
// ============================================================================
export function buildFieldZodSchema(field: FieldConfig): z.ZodTypeAny {
  switch (field.type) {
    case "shortText":
    case "longText": {
      const baseString = z
        .string()
        .trim()
        .max(
          field.maxLength,
          `Please keep this under ${field.maxLength} characters.`
        );

      const minLen = field.minLength ?? (field.required ? 2 : 0);

      if (field.required) {
        return baseString
          .min(
            minLen,
            field.errorMessage ??
              (minLen > 1
                ? `Please enter at least ${minLen} characters.`
                : `${field.label} is required.`)
          )
          .refine((val) => MEANINGFUL_TEXT_REGEX.test(val), {
            message:
              field.errorMessage ??
              `Please enter valid text for ${field.label.toLowerCase()}.`,
          });
      }

      return baseString
        .optional()
        .default("")
        .superRefine((val, ctx) => {
          if (!val) return;
          if (field.minLength && val.length < field.minLength) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                field.errorMessage ??
                `Please enter at least ${field.minLength} characters.`,
            });
            return;
          }
          if (!MEANINGFUL_TEXT_REGEX.test(val)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Please enter valid text rather than only symbols.`,
            });
            return;
          }
          if (field.key === "photo_link_fallback" && !isValidHttpUrl(val)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "Please enter a valid shared folder URL starting with https:// (e.g. Google Drive or WeTransfer).",
            });
          }
        });
    }

    case "number": {
      const baseNum = z.preprocess((val) => {
        if (val === "" || val === null || val === undefined) return undefined;
        const parsed = typeof val === "number" ? val : Number(val);
        return Number.isNaN(parsed) ? val : parsed;
      }, z.number({ invalid_type_error: field.errorMessage ?? "Please enter a valid number." }));

      return baseNum.superRefine((val, ctx) => {
        if (val === undefined) {
          if (field.required) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: field.errorMessage ?? `${field.label} is required.`,
            });
          }
          return;
        }
        if (field.wholeNumber && !Number.isInteger(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: field.errorMessage ?? "Please enter a whole number.",
          });
        }
        if (field.min !== undefined && field.max !== undefined) {
          if (val < field.min || val > field.max) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                field.errorMessage ??
                `Please enter a number between ${field.min} and ${field.max}.`,
            });
          }
        }
      });
    }

    case "date": {
      const base = z.string().trim();
      if (field.required) {
        return base
          .min(1, field.errorMessage ?? `${field.label} is required.`)
          .refine((val) => isValidCalendarDate(val), {
            message:
              field.errorMessage ??
              "Please select a complete, valid calendar date (Day, Month, and Year).",
          });
      }
      return base
        .optional()
        .default("")
        .refine((val) => val === "" || isValidCalendarDate(val), {
          message:
            field.errorMessage ??
            "Please select a complete, valid calendar date (Day, Month, and Year).",
        });
    }

    case "radio": {
      const [firstOption, ...restOptions] = field.options;
      if (!firstOption) {
        throw new Error(`Radio field ${field.key} must have at least one option.`);
      }
      const enumSchema = z.enum([firstOption, ...restOptions], {
        errorMap: () => ({
          message: field.errorMessage ?? `Please select an option for ${field.label}.`,
        }),
      });
      if (field.key === "subject_gender") {
        return enumSchema.default("Female");
      }
      return field.required ? enumSchema : enumSchema.optional();
    }

    case "email": {
      const base = z
        .string()
        .trim()
        .email(field.errorMessage ?? "Please enter a valid email address.")
        .refine((val) => STRICT_EMAIL_REGEX.test(val), {
          message: field.errorMessage ?? "Please enter a complete email address (e.g. name@example.com).",
        });
      return field.required ? base : base.optional().or(z.literal(""));
    }

    case "phone": {
      return z
        .string()
        .trim()
        .superRefine((val, ctx) => {
          if (!val) {
            if (field.required) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: field.errorMessage ?? `${field.label} is required.`,
              });
            }
            return;
          }
          const result = normalizePhoneToE164(val, field.defaultCountry);
          if (!result.valid) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: field.errorMessage ?? result.error,
            });
          }
        })
        .transform((val) => {
          if (!val) return "";
          const result = normalizePhoneToE164(val, field.defaultCountry);
          return result.valid ? result.e164 : val;
        });
    }

    case "checkbox": {
      if (field.required) {
        return z.boolean().refine((val) => val === true, {
          message: field.errorMessage ?? `${field.label} is required.`,
        });
      }
      return z.boolean().optional().default(false);
    }

    case "repeatableRows": {
      const rowShape: Record<string, z.ZodTypeAny> = {};
      for (const sub of field.subFields) {
        rowShape[sub.key] = z
          .string()
          .trim()
          .max(
            sub.maxLength,
            `${sub.label} must be ${sub.maxLength} characters or fewer.`
          )
          .default("");
      }
      const rowObjectSchema = z.object(rowShape);

      return z
        .array(rowObjectSchema)
        .max(field.maxRows, `Maximum of ${field.maxRows} rows allowed.`)
        .default([])
        .superRefine((rows, ctx) => {
          let filledCount = 0;

          rows.forEach((row, index) => {
            const values = field.subFields.map((sf) => {
              const v = row[sf.key];
              return typeof v === "string" ? v.trim() : "";
            });
            const anyFilled = values.some((v) => v.length > 0);
            const allFilled = values.every((v) => v.length > 0);

            if (anyFilled) {
              field.subFields.forEach((sf) => {
                const v = typeof row[sf.key] === "string" ? row[sf.key].trim() : "";
                if (!v) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [index, sf.key],
                    message: `Please complete ${sf.label.toLowerCase()} for this entry.`,
                  });
                } else if (!MEANINGFUL_TEXT_REGEX.test(v)) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [index, sf.key],
                    message: `Please enter valid text for ${sf.label.toLowerCase()}.`,
                  });
                }
              });
            } else if (field.minRows > 0 && field.minRows === field.maxRows) {
              field.subFields.forEach((sf) => {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  path: [index, sf.key],
                  message: `Please enter ${sf.label.toLowerCase()} for entry ${index + 1}.`,
                });
              });
            }

            if (
              allFilled &&
              values.every((v) => MEANINGFUL_TEXT_REGEX.test(v))
            ) {
              filledCount += 1;
            }
          });

          if (field.minRows > 0 && filledCount < field.minRows) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                field.errorMessage ??
                `Please complete at least ${field.minRows} ${
                  field.minRows === 1 ? "entry" : "entries"
                }.`,
            });
          }
        });
    }

    case "photoUpload": {
      return z
        .array(uploadedPhotoItemSchema)
        .default([])
        .superRefine((items, ctx) => {
          if (field.required && items.length < field.minPhotos) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                field.errorMessage ?? PHOTO_UPLOAD_CONFIG.friendlyMinMessage,
            });
          }
          if (items.length > field.maxPhotos) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Please upload at most ${field.maxPhotos} photos.`,
            });
          }
        });
    }
  }
}

export function buildPageZodSchema(page: PageConfig) {
  const shape: Record<string, z.ZodTypeAny> = {};
  const conditionalFields: FieldConfig[] = [];

  for (const group of page.groups) {
    for (const field of group.fields) {
      shape[field.key] = buildFieldZodSchema(field);
      if (field.conditional) {
        conditionalFields.push(field);
      }
    }
  }

  return z.object(shape).superRefine((data, ctx) => {
    for (const field of conditionalFields) {
      const cond = field.conditional!;
      const triggerValue = data[cond.fieldKey];
      const isShown = triggerValue === cond.equals;

      if (isShown && cond.requiredWhenShown) {
        const val = data[field.key];
        const isEmpty =
          val === undefined ||
          val === null ||
          (typeof val === "string" && val.trim() === "");

        if (isEmpty) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field.key],
            message: field.errorMessage ?? `${field.label} is required.`,
          });
        }
      }
    }
  });
}

export function buildFullFormZodSchema(pages: readonly PageConfig[] = FORM_PAGES) {
  const shape: Record<string, z.ZodTypeAny> = {};
  const conditionalFields: FieldConfig[] = [];

  for (const page of pages) {
    for (const group of page.groups) {
      for (const field of group.fields) {
        shape[field.key] = buildFieldZodSchema(field);
        if (field.conditional) {
          conditionalFields.push(field);
        }
      }
    }
  }

  return z.object(shape).superRefine((data, ctx) => {
    for (const field of conditionalFields) {
      const cond = field.conditional!;
      const triggerValue = data[cond.fieldKey];
      const isShown = triggerValue === cond.equals;

      if (isShown && cond.requiredWhenShown) {
        const val = data[field.key];
        const isEmpty =
          val === undefined ||
          val === null ||
          (typeof val === "string" && val.trim() === "");

        if (isEmpty) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field.key],
            message: field.errorMessage ?? `${field.label} is required.`,
          });
        }
      }
    }
  });
}

export const fullFormSchema = buildFullFormZodSchema(FORM_PAGES);
export type FullFormValues = z.infer<typeof fullFormSchema>;

export function getAllFields(pages: readonly PageConfig[] = FORM_PAGES): FieldConfig[] {
  const result: FieldConfig[] = [];
  for (const page of pages) {
    for (const group of page.groups) {
      for (const field of group.fields) {
        result.push(field);
      }
    }
  }
  return result;
}

export function getDefaultFormValues(
  pages: readonly PageConfig[] = FORM_PAGES
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const field of getAllFields(pages)) {
    switch (field.type) {
      case "shortText":
      case "longText":
      case "date":
      case "email":
      case "phone":
        defaults[field.key] = "";
        break;
      case "number":
        defaults[field.key] = "";
        break;
      case "radio":
        defaults[field.key] = field.key === "subject_gender" ? "Female" : "";
        break;
      case "checkbox":
        defaults[field.key] = false;
        break;
      case "repeatableRows": {
        const emptyRow: Record<string, string> = {};
        for (const sf of field.subFields) {
          emptyRow[sf.key] = "";
        }
        const startCount = field.minRows > 0 ? field.minRows : field.initialRows;
        defaults[field.key] = Array.from({ length: startCount }, () => ({
          ...emptyRow,
        }));
        break;
      }
      case "photoUpload":
        defaults[field.key] = [];
        break;
    }
  }

  return defaults;
}
