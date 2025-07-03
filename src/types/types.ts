export type Movie = {
	id: number;
	title: string;
	release_year: number;
	poster_url: string;
	thumb_url: string;
	created_at: string;
	rankings: {
		id?: string;
		seen_it: boolean;
		ranking: number;
		user_id: string;
	}[];
};
