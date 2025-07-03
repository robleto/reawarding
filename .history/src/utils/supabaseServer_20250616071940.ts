// utils/supabaseServer.ts
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/supabase";

export function supabaseServer() {
	return createServerComponentClient<Database>({ cookies });
}
