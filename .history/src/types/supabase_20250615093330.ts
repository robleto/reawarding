export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json }
	| Json[];

export interface Database {
	public: {
		Tables: {
			moviesDB: {
				Row: {
					id: number;
					title: string;
					year: number;
					studio: string;
					genre: string;
					rating: number;
					userRanking: number;
					seen: boolean;
					movieThumb: string;
				};
				Insert: {
					id?: number;
					title: string;
					year: number;
					studio: string;
					genre: string;
					rating: number;
					userRanking: number;
					seen: boolean;
					movieThumb: string;
				};
				Update: Partial<
					Database["public"]["Tables"]["moviesDB"]["Insert"]
				>;
				Relationships: [];
			};
		};
		Views: object;
		Functions: object;
		Enums: object;
	};
}
