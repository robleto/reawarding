// Guest mode utilities for managing temporary user data
import type { Movie } from "@/types/types";

export interface GuestRanking {
  movieId: number;
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

const GUEST_DATA_KEY = "oscarworthy_guest_data";

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
  movieId: number,
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

export function getGuestRankingForMovie(movieId: number): GuestRanking | null {
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
          ranking: guestRanking.ranking || 0,
          seen_it: guestRanking.seenIt,
        }],
      };
    }
    
    return movie;
  });
}
