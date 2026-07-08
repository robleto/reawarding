export type Movie = {
	// UUID in the live schema (movies.id) — TMDB's numeric id lives in tmdb_id
	id: string;
	title: string;
	release_year: number;
	poster_url: string;
	thumb_url: string;
	backdrop_url?: string | null;
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
	tmdb_rating?: number;
	imdb_rating?: number;
	imdb_votes?: number;
	metacritic_score?: number;
	vote_count?: number;
	popularity?: number;
	director?: string;
	writer?: string;
	cast_list?: string[];
	mpaa_rating?: string;
	// Media enrichment fields (from TMDB)
	videos?: TMDBVideo[];
	images?: {
		backdrops?: TMDBImage[];
		posters?: TMDBImage[];
	};
	watch_providers?: {
		[region: string]: {
			flatrate?: WatchProvider[];
			rent?: WatchProvider[];
			buy?: WatchProvider[];
		};
	};
	similar_movies?: number[];
	keywords?: string[];
	tmdb_reviews?: TMDBReview[];
	alternative_titles?: AlternativeTitle[];
	media_enriched_at?: string;
	// User-specific fields
	rankings: {
		id?: string;
		seen_it: boolean;
		ranking: number | null;
		user_id: string;
	}[];
};

export type TMDBVideo = {
	key: string;
	name: string;
	type: string; // 'Trailer' | 'Teaser' | 'Clip' | 'Featurette' | 'Behind the Scenes'
	site: string; // 'YouTube'
	official: boolean;
	size?: number; // 1080, 720, 480, 360
};

export type TMDBImage = {
	file_path: string;
	aspect_ratio?: number;
	height?: number;
	width?: number;
	vote_average?: number;
};

export type WatchProvider = {
	provider_id: number;
	provider_name: string;
	logo_path: string;
	display_priority?: number;
};

export type TMDBReview = {
	author: string;
	author_details?: {
		name: string;
		username: string;
		avatar_path?: string;
		rating?: number;
	};
	content: string;
	created_at: string;
	id: string;
	url: string;
};

export type AlternativeTitle = {
	title: string;
	iso_3166_1: string; // Country code
	type?: string;
};
