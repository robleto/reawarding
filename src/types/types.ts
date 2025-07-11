export type Movie = {
	id: number;
	title: string;
	release_year: number;
	poster_url: string;
	thumb_url: string;
	created_at: string;
	// Enriched fields
	tmdb_id?: number;
	imdb_id?: string;
	overview?: string;
	tagline?: string;
	runtime?: number;
	genres?: string[];
	production_companies?: string[];
	production_countries?: string[];
	spoken_languages?: string[];
	budget?: number;
	revenue?: number;
	imdb_rating?: number;
	imdb_votes?: number;
	metacritic_score?: number;
	director?: string;
	writer?: string;
	cast_list?: string[];
	mpaa_rating?: string;
	// User-specific fields
	rankings: {
		id?: string;
		seen_it: boolean;
		ranking: number;
		user_id: string;
	}[];
};
