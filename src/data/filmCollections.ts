/**
 * Film Collections - Preset curated collections of movies
 * Similar to ready-made lists but static, curated collections
 */

export type CollectionCategory = 'featured' | 'awards' | 'lists' | 'franchises' | 'actors' | 'directors' | 'studios';

export type FilmCollection = {
  slug: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  tmdbIds: number[];
  color?: string; // tailwind color for theming
  category: CollectionCategory;
  featured?: boolean; // Show in main/featured view
};

export const FILM_COLLECTIONS: FilmCollection[] = [
  {
    slug: 'best-picture-winners',
    title: 'Best Picture Winners',
    description: 'Every Academy Award Best Picture winner from the first ceremony to the present',
    icon: 'Trophy',
    color: 'gold',
    category: 'awards',
    featured: true,
    tmdbIds: [
      // This would be populated with all Best Picture winner TMDB IDs
      // For now, a sample of recent winners:
      278, // The Shawshank Redemption
      238, // The Godfather
      240, // The Godfather Part II
      424, // Schindler's List
      389, // 12 Angry Men
      129, // Spirited Away
      19404, // Dilwale Dulhania Le Jayenge
      13, // Forrest Gump
      496243, // Parasite
      568124, // Green Book
      413594, // Everything Everywhere All at Once
    ],
  },
  {
    slug: 'criterion-collection',
    title: 'Criterion Collection',
    description: 'Essential cinema from around the world - the prestigious Criterion Collection',
    icon: 'Film',
    color: 'blue',
    category: 'lists',
    featured: true,
    tmdbIds: [
      // Sample Criterion films
      724, // The 400 Blows
      152, // Tokyo Story
      562, // Rashomon
      77, // Memento
      680, // Pulp Fiction
      12477, // Grave of the Fireflies
    ],
  },
  {
    slug: 'afi-top-100',
    title: 'AFI Top 100',
    description: "American Film Institute's 100 greatest American movies of all time",
    icon: 'Star',
    color: 'purple',
    category: 'lists',
    featured: true,
    tmdbIds: [
      // Sample AFI Top 100
      129, // Spirited Away
      13, // Forrest Gump
      11, // Star Wars
      238, // The Godfather
      278, // The Shawshank Redemption
      424, // Schindler's List
      389, // 12 Angry Men
    ],
  },
  {
    slug: 'imdb-top-250',
    title: 'IMDb Top 250',
    description: 'The highest rated films of all time according to IMDb users',
    icon: 'TrendingUp',
    color: 'yellow',
    category: 'lists',
    featured: true,
    tmdbIds: [
      278, // The Shawshank Redemption
      238, // The Godfather
      240, // The Godfather Part II
      424, // Schindler's List
      389, // 12 Angry Men
      129, // Spirited Away
      19404, // Dilwale Dulhania Le Jayenge
      13, // Forrest Gump
    ],
  },
  {
    slug: 'top-50-grossing-all-time',
    title: 'Top 50 Grossing All-Time',
    description: 'The highest-grossing films of all time at the worldwide box office',
    icon: 'DollarSign',
    color: 'green',
    category: 'lists',
    tmdbIds: [
      65,
      80,
      90,
      698687,
      134,
      157,
      164,
      2107,
      103,
      253,
      2108,
      240,
      11977,
      11887,
      350,
      1160164,
      222936,
      310,
      508,
      11774,
      2142,
      18444,
      571,
      579,
      596,
      11360,
      615,
      11778,
      679,
      773,
      5551,
      702,
      631,
      744,
      755,
      11426,
      333323,
      857,
      12107,
      872,
      5689,
      891,
      838,
      943,
      953,
      335984,
      935,
      1365,
      1374,
      10998,
    ],
  },
  {
    slug: 'top-50-since-2020',
    title: 'Top 50 Since 2020',
    description: 'The highest-grossing films released since 2020',
    icon: 'Calendar',
    color: 'blue',
    category: 'lists',
    tmdbIds: [
      76600,
      1180831,
      507089,
      1010581,
      937941,
      1022789,
      1061474,
      1084242,
      1228246,
      1387382,
      1124566,
      1241983,
      1062722,
      755898,
      1234821,
      1246049,
      1033148,
      785663,
      533533,
      1156594,
      701387,
      1311031,
      1309012,
      1539104,
      425274,
      798645,
      1448560,
      1069905,
      1117857,
      1116465,
      575265,
      617126,
      1327862,
      1130276,
      1261825,
      1248226,
      1128650,
      1022787,
      1242898,
      967941,
    ],
  },
  {
    slug: 'sight-and-sound',
    title: 'Sight & Sound Greatest',
    description: 'BFI Sight & Sound poll of the greatest films ever made',
    icon: 'Eye',
    color: 'red',
    category: 'lists',
    tmdbIds: [
      // Sample Sight & Sound films
      562, // Rashomon
      152, // Tokyo Story
      724, // The 400 Blows
    ],
  },
  {
    slug: 'oscar-nominees-2024',
    title: '2024 Oscar Nominees',
    description: 'All films nominated for Academy Awards at the 96th ceremony',
    icon: 'Award',
    color: 'amber',
    category: 'awards',
    tmdbIds: [
      // 2024 Oscar nominees
      466420, // Killers of the Flower Moon
      872585, // Oppenheimer
      603692, // John Wick: Chapter 4
      575264, // Mission: Impossible - Dead Reckoning Part One
    ],
  },
  {
    slug: 'oscar-nominees-2025',
    title: '2025 Oscar Nominees',
    description: 'Films eligible for the 97th Academy Awards ceremony',
    icon: 'Award',
    color: 'amber',
    category: 'awards',
    featured: true,
    tmdbIds: [
      // 2025 eligible films (examples)
      558449, // Gladiator II
      1034541, // Terrifier 3
      912649, // Venom: The Last Dance
      974453, // Absolution
    ],
  },
  {
    slug: 'cannes-palme-dor',
    title: "Palme d'Or Winners",
    description: 'Winners of the highest prize at the Cannes Film Festival',
    icon: 'Palmtree',
    color: 'green',
    category: 'awards',
    tmdbIds: [
      496243, // Parasite
      680, // Pulp Fiction
    ],
  },
  {
    slug: 'studio-ghibli',
    title: 'Studio Ghibli',
    description: 'The complete collection of Studio Ghibli animated masterpieces',
    icon: 'Wind',
    color: 'teal',
    category: 'studios',
    featured: true,
    tmdbIds: [
      129, // Spirited Away
      12477, // Grave of the Fireflies
      810, // My Neighbor Totoro
      128, // Princess Mononoke
      4935, // Howl's Moving Castle
    ],
  },
  {
    slug: 'a24-films',
    title: 'A24 Films',
    description: 'Critically acclaimed independent films from A24',
    icon: 'Sparkles',
    color: 'indigo',
    category: 'studios',
    tmdbIds: [
      545611, // Everything Everywhere All at Once
      419704, // Lady Bird
      508442, // Moonlight
      429422, // The Disaster Artist
    ],
  },
  {
    slug: 'marvel-cinematic-universe',
    title: 'Marvel Cinematic Universe',
    description: 'The complete MCU saga in chronological order',
    icon: 'Shield',
    color: 'red',
    category: 'franchises',
    featured: true,
    tmdbIds: [
      299534,
      299536,
      99861,
      24428,
      1726,
      10138,
      68721,
      271110,
      822119,
      1771,
      100402,
      76338,
      10195,
      32489,
      284053,
      616037,
      283995,
      118340,
      81188,
      284054,
      505642,
      557,
      559,
      1930,
      102382,
      429617,
      324857,
      558,
      634649,
      315635,
      569094,
      453395,
      284052,
      102899,
      363088,
      640146,
      299537,
      524434,
      566525,
      497698,
    ],
  },
  {
    slug: 'star-wars-saga',
    title: 'Star Wars Saga',
    description: 'The complete Star Wars film saga',
    icon: 'Rocket',
    color: 'slate',
    category: 'franchises',
    tmdbIds: [
      1894,
      1893,
      11,
      181808,
      181812,
      140607,
      1895,
      330459,
      348350,
    ],
  },
  {
    slug: 'adam-sandler',
    title: 'Adam Sandler Films',
    description: 'Comedies and dramatic performances from Adam Sandler',
    icon: 'Laugh',
    color: 'orange',
    category: 'actors',
    tmdbIds: [
      514999,
      50546,
      159824,
      1075794,
      9506,
      2022,
      1263256,
      400155,
      11017,
      38365,
      9291,
      9339,
      9614,
      10661,
      1824,
      9032,
      76492,
      10663,
      11003,
      109418,
      473033,
      1069905,
    ],
  },
  {
    slug: 'brad-pitt',
    title: 'Brad Pitt Films',
    description: 'Iconic performances from one of Hollywood\'s biggest stars',
    icon: 'Star',
    color: 'gold',
    category: 'actors',
    tmdbIds: [
      752623,
      787,
      628,
      4944,
      161,
      807,
      14411,
      60308,
      228150,
      107,
      550,
      298,
      318846,
      38055,
      466272,
      72190,
      63,
      1541,
      4922,
      163,
      652,
      16869,
      911430,
    ],
  },
  {
    slug: 'denzel-washington',
    title: 'Denzel Washington Films',
    description: 'Powerful performances from the two-time Academy Award winner',
    icon: 'Award',
    color: 'purple',
    category: 'actors',
    tmdbIds: [
      333484,
      11971,
      87502,
      558449,
      2034,
      4982,
      345887,
      9944,
      9800,
      156022,
      20504,
      59961,
      8963,
      10637,
      926393,
      388,
    ],
  },
  {
    slug: 'tom-hanks',
    title: 'Tom Hanks Films',
    description: 'Beloved classics from America\'s favorite everyman',
    icon: 'Heart',
    color: 'red',
    category: 'actors',
    tmdbIds: [
      301528,
      11287,
      1137350,
      497,
      140823,
      614934,
      862,
      363676,
      109424,
      13448,
      2280,
      2619,
      4147,
      10905,
      9800,
      13,
      594,
      863,
      747188,
      6951,
      8358,
      858,
      10193,
      5255,
      740985,
      2565,
      568,
      591,
      640,
      857,
      12309,
      6538,
      9489,
      10466,
    ],
  },
  {
    slug: 'julia-roberts',
    title: 'Julia Roberts Films',
    description: 'Romantic comedies and dramas from Hollywood\'s leading lady',
    icon: 'Sparkles',
    color: 'pink',
    category: 'actors',
    tmdbIds: [
      1265063,
      137116,
      462,
      4806,
      161,
      11467,
      9944,
      406997,
      9441,
      879,
      11191,
      114,
      163,
      509,
      7442,
      6538,
      8874,
    ],
  },
  {
    slug: 'meryl-streep',
    title: 'Meryl Streep Films',
    description: 'Masterful performances from the most nominated actor in Oscar history',
    icon: 'Trophy',
    color: 'amber',
    category: 'actors',
    tmdbIds: [
      15764,
      606,
      458423,
      10315,
      11631,
      2757,
      12102,
      646380,
      350,
      11774,
      11778,
      9374,
    ],
  },
  {
    slug: 'dc-universe',
    title: 'DC Universe',
    description: 'Films from the DC Extended Universe and DC Comics adaptations',
    icon: 'Zap',
    color: 'blue',
    category: 'franchises',
    tmdbIds: [
      324849,
      414906,
      415,
      209112,
      272,
      14919,
      125249,
      364,
      414,
      8536,
      1061474,
      1452,
      9531,
      11411,
      297762,
      464052,
      572802,
      65584,
      141052,
      791373,
      297761,
      436969,
      594767,
      287947,
      436270,
      495764,
      475557,
      889737,
    ],
  },
  {
    slug: 'fast-and-furious',
    title: 'Fast & Furious',
    description: 'The complete Fast & Furious franchise of high-octane action',
    icon: 'Gauge',
    color: 'red',
    category: 'franchises',
    tmdbIds: [
      164,
      2108,
      13342,
      584,
      82992,
      14897,
      51497,
      9799,
      9615,
      385687,
      337339,
      168259,
      385128,
    ],
  },
  {
    slug: 'x-men',
    title: 'X-Men Universe',
    description: 'X-Men films including Deadpool and mutant stories',
    icon: 'Users',
    color: 'purple',
    category: 'franchises',
    tmdbIds: [
      36668,
      691677,
      2080,
      127585,
      36657,
      76170,
      533535,
      293660,
      383498,
      10803,
      263115,
      340102,
    ],
  },
  {
    slug: 'star-trek',
    title: 'Star Trek',
    description: 'Boldly going where no one has gone before across all Star Trek films',
    icon: 'Sparkles',
    color: 'cyan',
    category: 'franchises',
    tmdbIds: [
      157,
      193,
      200,
      172,
      199,
      201,
      174,
      188927,
      13475,
      152,
      168,
      154,
      54138,
    ],
  },
  {
    slug: 'the-muppets',
    title: 'The Muppets',
    description: 'The complete collection of Muppet theatrical films',
    icon: 'Smile',
    color: 'green',
    category: 'franchises',
    tmdbIds: [
      64328,
      698609,
      10437,
      11899,
      145220,
      14900,
      11176,
    ],
  },
  {
    slug: 'nolan-filmography',
    title: 'Christopher Nolan Collection',
    description: 'Complete works of visionary director Christopher Nolan',
    icon: 'Clapperboard',
    color: 'gray',
    category: 'directors',
    featured: true,
    tmdbIds: [
      155,
      577922,
      872585,
      27205,
      272,
      77,
      374720,
      49026,
      1124,
      157336,
    ],
  },
  {
    slug: 'tarantino-filmography',
    title: 'Quentin Tarantino Collection',
    description: 'All feature films directed by Quentin Tarantino',
    icon: 'Clapperboard',
    color: 'orange',
    category: 'directors',
    tmdbIds: [
      500,
      24,
      393,
      16869,
      466272,
      68718,
      680,
      414419,
    ],
  },
  {
    slug: 'steven-spielberg',
    title: 'Steven Spielberg Films',
    description: 'Blockbusters and intimate dramas from cinema\'s most successful director',
    icon: 'Film',
    color: 'blue',
    category: 'directors',
    tmdbIds: [
      17578,
      511809,
      74,
      87,
      329,
      640,
      879,
      330,
      840,
      72976,
      333339,
      804095,
      857,
      85,
      594,
      89,
      217,
      578,
      644,
      180,
      424,
      601,
    ],
  },
  {
    slug: 'wes-anderson',
    title: 'Wes Anderson Films',
    description: 'Meticulously crafted, visually stunning films with quirky characters',
    icon: 'Palette',
    color: 'pink',
    category: 'directors',
    tmdbIds: [
      10315,
      747188,
      83666,
      421,
      9428,
      11545,
      399174,
      120467,
      542178,
      1137350,
    ],
  },
  {
    slug: 'james-cameron',
    title: 'James Cameron Films',
    description: 'Epic blockbusters pushing the boundaries of visual effects',
    icon: 'Waves',
    color: 'cyan',
    category: 'directors',
    tmdbIds: [
      222936,
      679,
      2028,
      786,
      9390,
      109451,
      74465,
      1903,
      280,
      597,
      76600,
      19995,
    ],
  },
  {
    slug: 'pixar-collection',
    title: 'Pixar Animation',
    description: 'The complete Pixar animated feature films',
    icon: 'Lightbulb',
    color: 'sky',
    category: 'studios',
    tmdbIds: [
      862, // Toy Story
      863, // Toy Story 2
      10193, // Toy Story 3
      260513, // Incredibles 2
      508943, // Luca
      508947, // Turning Red
    ],
  },
  {
    slug: 'disney-animation',
    title: 'Disney Animation',
    description: 'Classic and modern animated films from Walt Disney Animation Studios',
    icon: 'Castle',
    color: 'blue',
    category: 'studios',
    tmdbIds: [],
  },
  {
    slug: 'dreamworks',
    title: 'DreamWorks Animation',
    description: 'Animated adventures from Shrek to How to Train Your Dragon',
    icon: 'Cloud',
    color: 'sky',
    category: 'studios',
    tmdbIds: [],
  },
];

/**
 * Get a collection by slug
 */
export function getCollectionBySlug(slug: string): FilmCollection | undefined {
  return FILM_COLLECTIONS.find(c => c.slug === slug);
}

/**
 * Get all collection slugs for static generation
 */
export function getAllCollectionSlugs(): string[] {
  return FILM_COLLECTIONS.map(c => c.slug);
}

/**
 * Get collections by category
 */
export function getCollectionsByCategory(category: CollectionCategory): FilmCollection[] {
  return FILM_COLLECTIONS.filter(c => c.category === category);
}

/**
 * Get featured collections for main view
 */
export function getFeaturedCollections(): FilmCollection[] {
  return FILM_COLLECTIONS.filter(c => c.featured);
}

/**
 * Category labels for UI
 */
export const CATEGORY_LABELS: Record<CollectionCategory, string> = {
  featured: 'Featured',
  awards: 'Awards & Honors',
  lists: 'Essential Lists',
  franchises: 'Franchises',  actors: 'Actors',  directors: 'Directors',
  studios: 'Studios',
};
