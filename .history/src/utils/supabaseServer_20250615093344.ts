import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
// Update the import path below if your supabase types are located elsewhere
import { Database } from "@/types/supabase";

export const supabaseServer = () =>
	createServerComponentClient<Database>({ cookies });
