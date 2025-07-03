import type { SupabaseClient } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";

async function getAvailableYears(supabase: SupabaseClient<Database>): Promise<number[]> {
    const { data, error } = await supabase
        .from("movies")
        .select("release_year")
        .order("release_year", { ascending: false });

    if (error) {
        console.error("Error fetching years:", error.message);
        return [];
    }

    // Deduplicate and return sorted unique years
    const years = Array.from(new Set(data?.map((d) => d.release_year))).filter(Boolean) as number[];
        return years;
    }