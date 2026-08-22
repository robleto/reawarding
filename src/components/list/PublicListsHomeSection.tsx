import { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import HorizontalListRow from "@/components/list/HorizontalListRow";
import Loader from "@/components/ui/Loading";

export default function PublicListsHomeSection() {
  const supabase = useSupabaseClient();
  const [publicLists, setPublicLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLists() {
      setLoading(true);
      const { data: pubData } = await supabase
        .from("movie_lists")
        .select("*")
        .eq("is_public", true)
        .order("updated_at", { ascending: false });
      if (pubData) {
        const publicListsWithData = await Promise.all(
          pubData.map(async (list) => {
            const { count } = await supabase
              .from("movie_list_items")
              .select("*", { count: "exact", head: true })
              .eq("list_id", list.id);
            const { data: items } = await supabase
              .from("movie_list_items")
              .select("movie_id")
              .eq("list_id", list.id)
              .order("ranking", { ascending: false })
              .limit(5);
            const movieIds = (items || []).map((item) => item.movie_id);
            let posterUrls: string[] = [];
            if (movieIds.length > 0) {
              const { data: movies } = await supabase
                .from("movies")
                .select("id,poster_url")
                .in("id", movieIds);
              posterUrls = movieIds.map(
                (id) => movies?.find((m) => m.id === id)?.poster_url || ""
              );
            }
            return {
              ...list,
              movie_count: count || 0,
              posterUrls,
            };
          })
        );
        setPublicLists(publicListsWithData);
      } else {
        setPublicLists([]);
      }
      setLoading(false);
    }
    fetchLists();
  }, [supabase]);

  if (loading) return <Loader message="Loading public lists..." />;

  return (
    <section className="py-10 -mx-10 sm:-mx-6 px-10 sm:px-6">
      <h2 className="text-2xl font-bold text-white mb-4">Public Lists</h2>
      <HorizontalListRow title="All Public Lists" lists={publicLists} readOnly seeAllHref="/lists/public" />
    </section>
  );
}
