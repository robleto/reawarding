export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          id: string
          list_id: string | null
          metadata: Json
          movie_id: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          id?: string
          list_id?: string | null
          metadata?: Json
          movie_id?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          id?: string
          list_id?: string | null
          metadata?: Json
          movie_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "movie_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies_with_genres"
            referencedColumns: ["id"]
          },
        ]
      }
      award_categories: {
        Row: {
          canonical_slug: string
          category_type: string
          ceremony_id: string
          created_at: string
          display_name: string
          id: string
          ordinal: number | null
        }
        Insert: {
          canonical_slug: string
          category_type: string
          ceremony_id: string
          created_at?: string
          display_name: string
          id?: string
          ordinal?: number | null
        }
        Update: {
          canonical_slug?: string
          category_type?: string
          ceremony_id?: string
          created_at?: string
          display_name?: string
          id?: string
          ordinal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "award_categories_ceremony_id_fkey"
            columns: ["ceremony_id"]
            isOneToOne: false
            referencedRelation: "ceremonies"
            referencedColumns: ["id"]
          },
        ]
      }
      awards: {
        Row: {
          category: string
          created_at: string | null
          id: string
          nominee_ids: string[] | null
          updated_at: string | null
          user_id: string | null
          winner_id: string | null
          year: number
        }
        Insert: {
          category?: string
          created_at?: string | null
          id?: string
          nominee_ids?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          winner_id?: string | null
          year: number
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          nominee_ids?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          winner_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "awards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "movies_with_genres"
            referencedColumns: ["id"]
          },
        ]
      }
      ceremonies: {
        Row: {
          created_at: string
          domain: string
          event_date: string | null
          id: string
          location: string | null
          official_name: string | null
          short_name: string | null
          year: number
        }
        Insert: {
          created_at?: string
          domain: string
          event_date?: string | null
          id?: string
          location?: string | null
          official_name?: string | null
          short_name?: string | null
          year: number
        }
        Update: {
          created_at?: string
          domain?: string
          event_date?: string | null
          id?: string
          location?: string | null
          official_name?: string | null
          short_name?: string | null
          year?: number
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          component_name: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_name?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_name?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      expressions: {
        Row: {
          created_at: string
          favorite_quote: string | null
          id: string
          movie_id: string
          notes: string | null
          quality_tags: string[]
          updated_at: string
          user_id: string
          would_recommend: boolean | null
        }
        Insert: {
          created_at?: string
          favorite_quote?: string | null
          id?: string
          movie_id: string
          notes?: string | null
          quality_tags?: string[]
          updated_at?: string
          user_id: string
          would_recommend?: boolean | null
        }
        Update: {
          created_at?: string
          favorite_quote?: string | null
          id?: string
          movie_id?: string
          notes?: string | null
          quality_tags?: string[]
          updated_at?: string
          user_id?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "expressions_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expressions_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies_with_genres"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          description: string
          feedback_type: string
          id: string
          metadata: Json | null
          title: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          feedback_type: string
          id?: string
          metadata?: Json | null
          title: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          feedback_type?: string
          id?: string
          metadata?: Json | null
          title?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      film_collection_items: {
        Row: {
          added_at: string | null
          collection_id: string
          tmdb_id: number
        }
        Insert: {
          added_at?: string | null
          collection_id: string
          tmdb_id: number
        }
        Update: {
          added_at?: string | null
          collection_id?: string
          tmdb_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "film_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "film_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "film_collections_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "film_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "user_collection_progress_view"
            referencedColumns: ["collection_id"]
          },
        ]
      }
      film_collections: {
        Row: {
          badge_color: string | null
          badge_icon: string | null
          category: string
          collection_type: Database["public"]["Enums"]["collection_type"] | null
          color: string | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          icon: string | null
          id: string
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          badge_color?: string | null
          badge_icon?: string | null
          category: string
          collection_type?:
            | Database["public"]["Enums"]["collection_type"]
            | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          icon?: string | null
          id?: string
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          badge_color?: string | null
          badge_icon?: string | null
          category?: string
          collection_type?:
            | Database["public"]["Enums"]["collection_type"]
            | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          icon?: string | null
          id?: string
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
          user_high: string
          user_low: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status: string
          updated_at?: string
          user_high: string
          user_low: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
          user_high?: string
          user_low?: string
        }
        Relationships: []
      }
      genres: {
        Row: {
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: never
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      imports: {
        Row: {
          fanart_thumb_url: string | null
          id: string
          imported_at: string
          notes: string | null
          poster_url: string | null
          status: string | null
          thumb_url: string | null
          tmdb_id: number
        }
        Insert: {
          fanart_thumb_url?: string | null
          id?: string
          imported_at?: string
          notes?: string | null
          poster_url?: string | null
          status?: string | null
          thumb_url?: string | null
          tmdb_id: number
        }
        Update: {
          fanart_thumb_url?: string | null
          id?: string
          imported_at?: string
          notes?: string | null
          poster_url?: string | null
          status?: string | null
          thumb_url?: string | null
          tmdb_id?: number
        }
        Relationships: []
      }
      movie_genres: {
        Row: {
          created_at: string | null
          genre_id: number
          id: number
          movie_id: string
        }
        Insert: {
          created_at?: string | null
          genre_id: number
          id?: never
          movie_id: string
        }
        Update: {
          created_at?: string | null
          genre_id?: number
          id?: never
          movie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_genres_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_genres_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies_with_genres"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_list_items: {
        Row: {
          created_at: string | null
          id: string
          list_id: string
          movie_id: string
          ranking: number | null
          score: number | null
          seen_it: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          list_id: string
          movie_id: string
          ranking?: number | null
          score?: number | null
          seen_it?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          list_id?: string
          movie_id?: string
          ranking?: number | null
          score?: number | null
          seen_it?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movie_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "movie_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_list_items_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_list_items_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies_with_genres"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_lists: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          list_type: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          list_type?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          list_type?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      movie_reviews: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_public: boolean | null
          movie_id: string
          rating: number | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          movie_id: string
          rating?: number | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          movie_id?: string
          rating?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_reviews_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_reviews_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies_with_genres"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          adult: boolean | null
          alternative_titles: Json | null
          backdrop_url: string | null
          budget: number | null
          cached_at: string | null
          cast_list: string[] | null
          created_at: string | null
          director: string | null
          genre_ids: number[]
          genres: string[] | null
          id: string
          images: Json | null
          imdb_id: string | null
          imdb_rating: number | null
          imdb_votes: number | null
          keywords: string[] | null
          media_enriched_at: string | null
          metacritic_score: number | null
          mpaa_rating: string | null
          original_language: string | null
          original_title: string | null
          overview: string | null
          popularity: number | null
          poster_url: string | null
          production_companies: string[] | null
          production_countries: string[] | null
          release_date: string | null
          release_year: number | null
          revenue: number | null
          runtime: number | null
          similar_movies: number[] | null
          spoken_languages: string[] | null
          status: string | null
          tagline: string | null
          thumb_url: string | null
          title: string
          tmdb_collection_id: number | null
          tmdb_collection_name: string | null
          tmdb_id: number | null
          tmdb_rating: number | null
          tmdb_reviews: Json | null
          updated_at: string | null
          videos: Json | null
          vote_average: number | null
          vote_count: number | null
          watch_providers: Json | null
          writer: string | null
        }
        Insert: {
          adult?: boolean | null
          alternative_titles?: Json | null
          backdrop_url?: string | null
          budget?: number | null
          cached_at?: string | null
          cast_list?: string[] | null
          created_at?: string | null
          director?: string | null
          genre_ids?: number[]
          genres?: string[] | null
          id?: string
          images?: Json | null
          imdb_id?: string | null
          imdb_rating?: number | null
          imdb_votes?: number | null
          keywords?: string[] | null
          media_enriched_at?: string | null
          metacritic_score?: number | null
          mpaa_rating?: string | null
          original_language?: string | null
          original_title?: string | null
          overview?: string | null
          popularity?: number | null
          poster_url?: string | null
          production_companies?: string[] | null
          production_countries?: string[] | null
          release_date?: string | null
          release_year?: number | null
          revenue?: number | null
          runtime?: number | null
          similar_movies?: number[] | null
          spoken_languages?: string[] | null
          status?: string | null
          tagline?: string | null
          thumb_url?: string | null
          title: string
          tmdb_collection_id?: number | null
          tmdb_collection_name?: string | null
          tmdb_id?: number | null
          tmdb_rating?: number | null
          tmdb_reviews?: Json | null
          updated_at?: string | null
          videos?: Json | null
          vote_average?: number | null
          vote_count?: number | null
          watch_providers?: Json | null
          writer?: string | null
        }
        Update: {
          adult?: boolean | null
          alternative_titles?: Json | null
          backdrop_url?: string | null
          budget?: number | null
          cached_at?: string | null
          cast_list?: string[] | null
          created_at?: string | null
          director?: string | null
          genre_ids?: number[]
          genres?: string[] | null
          id?: string
          images?: Json | null
          imdb_id?: string | null
          imdb_rating?: number | null
          imdb_votes?: number | null
          keywords?: string[] | null
          media_enriched_at?: string | null
          metacritic_score?: number | null
          mpaa_rating?: string | null
          original_language?: string | null
          original_title?: string | null
          overview?: string | null
          popularity?: number | null
          poster_url?: string | null
          production_companies?: string[] | null
          production_countries?: string[] | null
          release_date?: string | null
          release_year?: number | null
          revenue?: number | null
          runtime?: number | null
          similar_movies?: number[] | null
          spoken_languages?: string[] | null
          status?: string | null
          tagline?: string | null
          thumb_url?: string | null
          title?: string
          tmdb_collection_id?: number | null
          tmdb_collection_name?: string | null
          tmdb_id?: number | null
          tmdb_rating?: number | null
          tmdb_reviews?: Json | null
          updated_at?: string | null
          videos?: Json | null
          vote_average?: number | null
          vote_count?: number | null
          watch_providers?: Json | null
          writer?: string | null
        }
        Relationships: []
      }
      nomination_people: {
        Row: {
          created_at: string
          id: string
          nomination_id: string
          person_id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nomination_id: string
          person_id: string
          role?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nomination_id?: string
          person_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nomination_people_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "nominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nomination_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      nominations: {
        Row: {
          bgg_id: number | null
          category_id: string
          created_at: string
          id: string
          imdb_id: string | null
          is_winner: boolean
          notes: string | null
          tmdb_id: number | null
          work_title: string | null
          work_year: number | null
        }
        Insert: {
          bgg_id?: number | null
          category_id: string
          created_at?: string
          id?: string
          imdb_id?: string | null
          is_winner?: boolean
          notes?: string | null
          tmdb_id?: number | null
          work_title?: string | null
          work_year?: number | null
        }
        Update: {
          bgg_id?: number | null
          category_id?: string
          created_at?: string
          id?: string
          imdb_id?: string | null
          is_winner?: boolean
          notes?: string | null
          tmdb_id?: number | null
          work_title?: string | null
          work_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nominations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "award_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          alt_names: string[] | null
          created_at: string
          id: string
          imdb_id: string | null
          name: string
        }
        Insert: {
          alt_names?: string[] | null
          created_at?: string
          id?: string
          imdb_id?: string | null
          name: string
        }
        Update: {
          alt_names?: string[] | null
          created_at?: string
          id?: string
          imdb_id?: string | null
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          last_login: string | null
          last_name: string | null
          onboarding_complete: boolean
          preferred_era: string | null
          preferred_genres: string[] | null
          preferred_name: string | null
          signature_picks: Json | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          last_login?: string | null
          last_name?: string | null
          onboarding_complete?: boolean
          preferred_era?: string | null
          preferred_genres?: string[] | null
          preferred_name?: string | null
          signature_picks?: Json | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_login?: string | null
          last_name?: string | null
          onboarding_complete?: boolean
          preferred_era?: string | null
          preferred_genres?: string[] | null
          preferred_name?: string | null
          signature_picks?: Json | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      rankings: {
        Row: {
          created_at: string | null
          id: string
          imported_from: string | null
          movie_id: string | null
          notes: string | null
          ranking: number | null
          seen_it: boolean | null
          updated_at: string | null
          user_id: string | null
          watchlist: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          imported_from?: string | null
          movie_id?: string | null
          notes?: string | null
          ranking?: number | null
          seen_it?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          watchlist?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          imported_from?: string | null
          movie_id?: string | null
          notes?: string | null
          ranking?: number | null
          seen_it?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          watchlist?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "rankings_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rankings_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies_with_genres"
            referencedColumns: ["id"]
          },
        ]
      }
      user_collection_progress: {
        Row: {
          collection_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          films_seen: number | null
          total_films: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          collection_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          films_seen?: number | null
          total_films: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          collection_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          films_seen?: number | null
          total_films?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_collection_progress_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "film_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collection_progress_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "film_collections_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collection_progress_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "user_collection_progress_view"
            referencedColumns: ["collection_id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      app_users: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      film_collections_with_counts: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          icon: string | null
          id: string | null
          movie_count: number | null
          slug: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      movies_with_genres: {
        Row: {
          director: string | null
          genres: string[] | null
          id: string | null
          imdb_id: string | null
          imdb_rating: number | null
          metacritic_score: number | null
          overview: string | null
          poster_url: string | null
          release_year: number | null
          runtime: number | null
          thumb_url: string | null
          title: string | null
          tmdb_rating: number | null
        }
        Relationships: []
      }
      user_collection_progress_view: {
        Row: {
          badge_color: string | null
          badge_icon: string | null
          collection_id: string | null
          collection_type: Database["public"]["Enums"]["collection_type"] | null
          completion_percentage: number | null
          films_seen: number | null
          is_completed: boolean | null
          slug: string | null
          title: string | null
          total_films: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_film_award_badges_by_imdb: { Args: { p_imdb: string }; Returns: Json }
      get_film_awards_by_imdb: { Args: { p_imdb: string }; Returns: Json }
      get_movies_by_genre: {
        Args: { genre_name: string }
        Returns: {
          director: string
          id: string
          imdb_id: string
          imdb_rating: number
          metacritic_score: number
          overview: string
          poster_url: string
          release_year: number
          runtime: number
          thumb_url: string
          title: string
          tmdb_rating: number
        }[]
      }
      get_participation_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          avatar_url: string
          list_items_count: number
          lists_count: number
          preferred_name: string
          rankings_count: number
          score: number
          user_id: string
          username: string
        }[]
      }
      get_profile_safe: {
        Args: { target_user_id: string }
        Returns: Database["public"]["CompositeTypes"]["safe_profile"]
        SetofOptions: {
          from: "*"
          to: "safe_profile"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_similar_movies: {
        Args: { limit_count?: number; target_movie_id: string }
        Returns: {
          cached_thumb_url: string
          id: string
          poster_url: string
          release_year: number
          similarity_score: number
          thumb_url: string
          title: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      run_tmdb_scraper: { Args: never; Returns: Json }
      update_list_item_rankings: { Args: { updates: Json }; Returns: undefined }
    }
    Enums: {
      collection_type: "list" | "micro" | "macro"
    }
    CompositeTypes: {
      safe_profile: {
        id: string | null
        username: string | null
        full_name: string | null
        avatar_url: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      collection_type: ["list", "micro", "macro"],
    },
  },
} as const
