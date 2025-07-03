import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
// Update the path below if your supabase type file is located elsewhere
import { Database } from "../../types/supabase";

export const supabaseServer = async () => {
	return createServerComponentClient<Database>({ cookies });
};
