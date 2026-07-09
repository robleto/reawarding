// Repairs movies whose poster_url/thumb_url is null or not yet on R2:
// re-fetches the poster path from TMDB by tmdb_id, mirrors the image to R2,
// and points the DB at the R2 copy. Companion to ingest-tmdb-images-to-r2.mjs.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import {
	S3Client,
	PutObjectCommand,
	HeadObjectCommand,
} from "@aws-sdk/client-s3";

const {
	NEXT_PUBLIC_SUPABASE_URL,
	SUPABASE_SERVICE_ROLE_KEY,
	TMDB_API_KEY,
	R2_ENDPOINT,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_PUBLIC_BASE_REAWARDING,
} = process.env;

for (const [name, value] of Object.entries({
	NEXT_PUBLIC_SUPABASE_URL,
	SUPABASE_SERVICE_ROLE_KEY,
	TMDB_API_KEY,
	R2_ENDPOINT,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_PUBLIC_BASE_REAWARDING,
})) {
	if (!value) throw new Error(`Missing ${name}`);
}

const supabase = createClient(
	NEXT_PUBLIC_SUPABASE_URL,
	SUPABASE_SERVICE_ROLE_KEY,
);

const r2 = new S3Client({
	region: "auto",
	endpoint: R2_ENDPOINT,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY,
	},
});

const BUCKET = "reawarding-images";
const BASE = R2_PUBLIC_BASE_REAWARDING;

const onR2 = (url) => !!url && url.includes("r2.dev");

async function exists(key) {
	try {
		await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
		return true;
	} catch {
		return false;
	}
}

async function fetchWithRetry(url, attempts = 3) {
	for (let i = 1; i <= attempts; i++) {
		try {
			const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });

			if (!res.ok) return null;

			return res;
		} catch (err) {
			console.log(`Fetch attempt ${i}/${attempts} failed for ${url}: ${err.message}`);

			if (i < attempts) await new Promise((r) => setTimeout(r, 2_000 * i));
		}
	}

	return null;
}

async function mirrorToR2(id, sourceUrl, folder, column) {
	const key = `${folder}/${id}.jpg`;

	if (!(await exists(key))) {
		const res = await fetchWithRetry(sourceUrl);

		if (!res) {
			console.log(`Failed fetch: ${sourceUrl}`);

			return false;
		}

		const buf = Buffer.from(await res.arrayBuffer());

		await r2.send(
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				Body: buf,
				ContentType: "image/jpeg",
				CacheControl: "public, max-age=31536000, immutable",
			}),
		);
	}

	const { error } = await supabase
		.from("movies")
		.update({ [column]: `${BASE}/${key}` })
		.eq("id", id);

	if (error) throw error;

	console.log(`Repaired ${column}: ${key}`);

	return true;
}

async function repair() {
	const { data: movies, error } = await supabase
		.from("movies")
		.select("id, title, tmdb_id, poster_url, thumb_url")
		.not("tmdb_id", "is", null)
		.or(
			"poster_url.is.null,thumb_url.is.null,poster_url.not.like.%r2.dev%,thumb_url.not.like.%r2.dev%",
		)
		.order("id")
		.limit(2000);

	if (error) throw error;

	console.log(`Found ${movies.length} movies to repair`);

	let repaired = 0;
	let noPosterPath = 0;

	for (const movie of movies) {
		try {
			const res = await fetchWithRetry(
				`https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${TMDB_API_KEY}`,
			);

			if (!res) {
				console.log(`TMDB lookup failed: ${movie.title} (${movie.tmdb_id})`);

				continue;
			}

			const details = await res.json();

			if (!details.poster_path) {
				noPosterPath++;

				console.log(`No poster on TMDB: ${movie.title} (${movie.tmdb_id})`);

				continue;
			}

			let ok = true;

			if (!onR2(movie.poster_url)) {
				ok =
					(await mirrorToR2(
						movie.id,
						`https://image.tmdb.org/t/p/original${details.poster_path}`,
						"posters",
						"poster_url",
					)) && ok;
			}

			if (!onR2(movie.thumb_url)) {
				ok =
					(await mirrorToR2(
						movie.id,
						`https://image.tmdb.org/t/p/w500${details.poster_path}`,
						"thumbs",
						"thumb_url",
					)) && ok;
			}

			if (ok) repaired++;
		} catch (err) {
			console.log(`Skipping ${movie.title} after error: ${err.message}`);
		}
	}

	console.log(
		`Repair complete: ${repaired} repaired, ${noPosterPath} have no poster on TMDB`,
	);
}

repair();
