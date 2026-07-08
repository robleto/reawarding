// Guest mode utilities for managing temporary user data
import type { Movie } from "@/types/types";

export interface GuestRanking {
  movieId: string;
  ranking: number | null;
  seenIt: boolean;
  timestamp: number;
}

export interface GuestData {
  rankings: GuestRanking[];
  hasInteracted: boolean;
  firstInteractionTime: number | null;
  totalInteractions: number; // Track total interaction count
}

const GUEST_DATA_KEY = "reawarding_guest_data";

export function getGuestData(): GuestData {
  if (typeof window === "undefined") {
    return { rankings: [], hasInteracted: false, firstInteractionTime: null, totalInteractions: 0 };
  }

  try {
    const stored = localStorage.getItem(GUEST_DATA_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure backward compatibility - add totalInteractions if missing
      return {
        ...parsed,
        totalInteractions: parsed.totalInteractions ?? 0
      };
    }
  } catch (error) {
    console.error("Error loading guest data:", error);
  }

  return { rankings: [], hasInteracted: false, firstInteractionTime: null, totalInteractions: 0 };
}

export function saveGuestData(data: GuestData): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving guest data:", error);
  }
}

export function updateGuestRanking(
  movieId: string,
  updates: { ranking?: number | null; seenIt?: boolean }
): void {
  const data = getGuestData();
  
  // Find existing ranking or create new one
  const existingIndex = data.rankings.findIndex(r => r.movieId === movieId);
  
  if (existingIndex >= 0) {
    // Update existing ranking
    const existing = data.rankings[existingIndex];
    data.rankings[existingIndex] = {
      ...existing,
      ranking: updates.ranking !== undefined ? updates.ranking : existing.ranking,
      seenIt: updates.seenIt !== undefined ? updates.seenIt : existing.seenIt,
      timestamp: Date.now(),
    };
  } else {
    // Create new ranking
    data.rankings.push({
      movieId,
      ranking: updates.ranking ?? null,
      seenIt: updates.seenIt ?? false,
      timestamp: Date.now(),
    });
  }

  // Mark as interacted and increment interaction counter
  if (!data.hasInteracted) {
    data.hasInteracted = true;
    data.firstInteractionTime = Date.now();
  }
  
  // Increment total interactions counter
  data.totalInteractions = (data.totalInteractions || 0) + 1;

  saveGuestData(data);
}

export function getGuestRankingForMovie(movieId: string): GuestRanking | null {
  const data = getGuestData();
  return data.rankings.find(r => r.movieId === movieId) || null;
}

export function clearGuestData(): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem(GUEST_DATA_KEY);
  } catch (error) {
    console.error("Error clearing guest data:", error);
  }
}

export function hasGuestInteracted(): boolean {
  const data = getGuestData();
  return data.hasInteracted;
}

export function getGuestInteractionCount(): number {
  const data = getGuestData();
  return data.rankings.length;
}

export function getTotalGuestInteractions(): number {
  const data = getGuestData();
  return data.totalInteractions || 0;
}

export function shouldShowSignupPrompt(): boolean {
  const data = getGuestData();
  if (!data.hasInteracted || !data.firstInteractionTime) return false;
  
  const totalInteractions = data.totalInteractions || 0;
  
  // Show banner after 10 interactions
  return totalInteractions >= 10;
}

// Transform guest data to match the expected Movie ranking format
export function applyGuestDataToMovies(movies: Movie[]): Movie[] {
  const guestData = getGuestData();

  return movies.map(movie => {
    const guestRanking = guestData.rankings.find(r => r.movieId === movie.id);

    if (guestRanking) {
      return {
        ...movie,
        rankings: [{
          id: `guest_${movie.id}`,
          user_id: 'guest',
          ranking: guestRanking.ranking ?? null,
          seen_it: guestRanking.seenIt,
        }],
      };
    }

    return movie;
  });
}

// --- Guest Award Utilities ---
// v1 simplification: year-keyed, category always "best-picture"

export interface GuestAwardData {
  year: number;
  winnerId: string;
  nomineeIds: string[];
  source: 'seed_pick' | 'ranking_calc' | 'manual';
  timestamp: number;
}

const GUEST_AWARDS_KEY = "reawarding_guest_awards";

function getGuestAwards(): Record<string, GuestAwardData> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(GUEST_AWARDS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveGuestAwards(awards: Record<string, GuestAwardData>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_AWARDS_KEY, JSON.stringify(awards));
  } catch (error) {
    console.error("Error saving guest awards:", error);
  }
}

export function updateGuestAward(
  year: number,
  winnerId: string,
  nomineeIds: string[],
  source: GuestAwardData['source'] = 'seed_pick'
): void {
  const awards = getGuestAwards();
  awards[String(year)] = {
    year,
    winnerId,
    nomineeIds,
    source,
    timestamp: Date.now(),
  };
  saveGuestAwards(awards);
}

export function getGuestAward(year: number): GuestAwardData | null {
  const awards = getGuestAwards();
  return awards[String(year)] || null;
}

export function getAllGuestAwards(): GuestAwardData[] {
  const awards = getGuestAwards();
  return Object.values(awards);
}

export function getGuestAwardCount(): number {
  const awards = getGuestAwards();
  return Object.keys(awards).length;
}

export function clearGuestAwards(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_AWARDS_KEY);
  } catch (error) {
    console.error("Error clearing guest awards:", error);
  }
}

export function clearAllGuestData(): void {
  clearGuestData();
  clearGuestAwards();
}
