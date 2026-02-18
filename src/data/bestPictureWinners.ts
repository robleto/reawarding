/**
 * Best Picture Winners — Static Academy Award lookup
 *
 * YEAR SEMANTICS INVARIANT:
 * All years in this file refer to the film's RELEASE YEAR, not the ceremony year.
 * Example: 2023 = Oppenheimer (released 2023, awarded at 2024 ceremony).
 * This convention is used throughout all award logic: API calls, guest storage,
 * UI display, and any external imports must normalize to release year.
 */

export interface ActualBestPicture {
  title: string;
  year: number;
}

/**
 * Map of release year → actual Academy Award Best Picture winner.
 * Coverage: 1927–2024. Add new years as ceremonies occur.
 */
export const BEST_PICTURE_WINNERS: Record<number, ActualBestPicture> = {
  2024: { title: "Anora", year: 2024 },
  2023: { title: "Oppenheimer", year: 2023 },
  2022: { title: "Everything Everywhere All at Once", year: 2022 },
  2021: { title: "CODA", year: 2021 },
  2020: { title: "Nomadland", year: 2020 },
  2019: { title: "Parasite", year: 2019 },
  2018: { title: "Green Book", year: 2018 },
  2017: { title: "The Shape of Water", year: 2017 },
  2016: { title: "Moonlight", year: 2016 },
  2015: { title: "Spotlight", year: 2015 },
  2014: { title: "Birdman", year: 2014 },
  2013: { title: "12 Years a Slave", year: 2013 },
  2012: { title: "Argo", year: 2012 },
  2011: { title: "The Artist", year: 2011 },
  2010: { title: "The King's Speech", year: 2010 },
  2009: { title: "The Hurt Locker", year: 2009 },
  2008: { title: "Slumdog Millionaire", year: 2008 },
  2007: { title: "No Country for Old Men", year: 2007 },
  2006: { title: "The Departed", year: 2006 },
  2005: { title: "Crash", year: 2005 },
  2004: { title: "Million Dollar Baby", year: 2004 },
  2003: { title: "The Lord of the Rings: The Return of the King", year: 2003 },
  2002: { title: "Chicago", year: 2002 },
  2001: { title: "A Beautiful Mind", year: 2001 },
  2000: { title: "Gladiator", year: 2000 },
  1999: { title: "American Beauty", year: 1999 },
  1998: { title: "Shakespeare in Love", year: 1998 },
  1997: { title: "Titanic", year: 1997 },
  1996: { title: "The English Patient", year: 1996 },
  1995: { title: "Braveheart", year: 1995 },
  1994: { title: "Forrest Gump", year: 1994 },
  1993: { title: "Schindler's List", year: 1993 },
  1992: { title: "Unforgiven", year: 1992 },
  1991: { title: "The Silence of the Lambs", year: 1991 },
  1990: { title: "Dances with Wolves", year: 1990 },
  1989: { title: "Driving Miss Daisy", year: 1989 },
  1988: { title: "Rain Man", year: 1988 },
  1987: { title: "The Last Emperor", year: 1987 },
  1986: { title: "Platoon", year: 1986 },
  1985: { title: "Out of Africa", year: 1985 },
  1984: { title: "Amadeus", year: 1984 },
  1983: { title: "Terms of Endearment", year: 1983 },
  1982: { title: "Gandhi", year: 1982 },
  1981: { title: "Chariots of Fire", year: 1981 },
  1980: { title: "Ordinary People", year: 1980 },
  1979: { title: "Kramer vs. Kramer", year: 1979 },
  1978: { title: "The Deer Hunter", year: 1978 },
  1977: { title: "Annie Hall", year: 1977 },
  1976: { title: "Rocky", year: 1976 },
  1975: { title: "One Flew Over the Cuckoo's Nest", year: 1975 },
  1974: { title: "The Godfather Part II", year: 1974 },
  1973: { title: "The Sting", year: 1973 },
  1972: { title: "The Godfather", year: 1972 },
  1971: { title: "The French Connection", year: 1971 },
  1970: { title: "Patton", year: 1970 },
  1969: { title: "Midnight Cowboy", year: 1969 },
  1968: { title: "Oliver!", year: 1968 },
  1967: { title: "In the Heat of the Night", year: 1967 },
  1966: { title: "A Man for All Seasons", year: 1966 },
  1965: { title: "The Sound of Music", year: 1965 },
  1964: { title: "My Fair Lady", year: 1964 },
  1963: { title: "Tom Jones", year: 1963 },
  1962: { title: "Lawrence of Arabia", year: 1962 },
  1961: { title: "West Side Story", year: 1961 },
  1960: { title: "The Apartment", year: 1960 },
  1959: { title: "Ben-Hur", year: 1959 },
  1958: { title: "Gigi", year: 1958 },
  1957: { title: "The Bridge on the River Kwai", year: 1957 },
  1956: { title: "Around the World in 80 Days", year: 1956 },
  1955: { title: "Marty", year: 1955 },
  1954: { title: "On the Waterfront", year: 1954 },
  1953: { title: "From Here to Eternity", year: 1953 },
  1952: { title: "The Greatest Show on Earth", year: 1952 },
  1951: { title: "An American in Paris", year: 1951 },
  1950: { title: "All About Eve", year: 1950 },
  1949: { title: "All the King's Men", year: 1949 },
  1948: { title: "Hamlet", year: 1948 },
  1947: { title: "Gentleman's Agreement", year: 1947 },
  1946: { title: "The Best Years of Our Lives", year: 1946 },
  1945: { title: "The Lost Weekend", year: 1945 },
  1944: { title: "Going My Way", year: 1944 },
  1943: { title: "Casablanca", year: 1943 },
  1942: { title: "Mrs. Miniver", year: 1942 },
  1941: { title: "How Green Was My Valley", year: 1941 },
  1940: { title: "Rebecca", year: 1940 },
  1939: { title: "Gone with the Wind", year: 1939 },
  1938: { title: "You Can't Take It with You", year: 1938 },
  1937: { title: "The Life of Emile Zola", year: 1937 },
  1936: { title: "The Great Ziegfeld", year: 1936 },
  1935: { title: "Mutiny on the Bounty", year: 1935 },
  1934: { title: "It Happened One Night", year: 1934 },
  1933: { title: "Cavalcade", year: 1933 },
  1932: { title: "Grand Hotel", year: 1932 },
  1931: { title: "Cimarron", year: 1931 },
  1930: { title: "All Quiet on the Western Front", year: 1930 },
  1929: { title: "The Broadway Melody", year: 1929 },
  1928: { title: "Wings", year: 1928 },
  1927: { title: "Sunrise: A Song of Two Humans", year: 1927 },
};

/**
 * Starter picks — diverse, beloved films that lost (or were snubbed by) Best Picture.
 * Used in the new user "Pick a movie you love" onboarding carousel.
 */
export interface StarterPick {
  title: string;
  year: number;
}

export const STARTER_PICKS: StarterPick[] = [
  { title: "The Shawshank Redemption", year: 1994 },
  { title: "Do the Right Thing", year: 1989 },
  { title: "Arrival", year: 2016 },
  { title: "The Dark Knight", year: 2008 },
  { title: "Spirited Away", year: 2001 },
  { title: "Get Out", year: 2017 },
  { title: "The Social Network", year: 2010 },
];

/**
 * Get the actual Academy Award Best Picture winner for a release year.
 * Returns null for years not in the dataset.
 */
export function getActualWinner(year: number): ActualBestPicture | null {
  return BEST_PICTURE_WINNERS[year] ?? null;
}

/**
 * Get a contextual message comparing the user's pick to the Academy's.
 * Graceful fallback: never shows incorrect data for missing years.
 */
export function getContextMessage(
  userPickTitle: string,
  year: number
): { message: string; agreedWithAcademy: boolean } {
  const actual = getActualWinner(year);

  if (!actual) {
    return {
      message: `You've chosen ${userPickTitle} as Best Picture of ${year}.`,
      agreedWithAcademy: false,
    };
  }

  if (actual.title.toLowerCase() === userPickTitle.toLowerCase()) {
    return {
      message: "You agree with the Academy!",
      agreedWithAcademy: true,
    };
  }

  return {
    message: `The Academy picked ${actual.title} instead.`,
    agreedWithAcademy: false,
  };
}
