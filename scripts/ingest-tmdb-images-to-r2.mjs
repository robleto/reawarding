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
	R2_ENDPOINT,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_PUBLIC_BASE_REAWARDING,
} = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL)
	throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY)
	throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!R2_ENDPOINT) throw new Error("Missing R2_ENDPOINT");
if (!R2_ACCESS_KEY_ID) throw new Error("Missing R2_ACCESS_KEY_ID");
if (!R2_SECRET_ACCESS_KEY) throw new Error("Missing R2_SECRET_ACCESS_KEY");
if (!R2_PUBLIC_BASE_REAWARDING)
	throw new Error("Missing R2_PUBLIC_BASE_REAWARDING");

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

async function exists(key) {
	try {
		await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
		return true;
	} catch {
		return false;
	}
}

async function ingest() {
	let offset = 0;
	const pageSize = 500;

	while (true) {
		const { data: movies, error } = await supabase
			.from("movies")
			.select("id, poster_url, thumb_url")
			.range(offset, offset + pageSize - 1);

		if (error) throw error;

		if (!movies.length) break;

		for (const movie of movies) {
			await ingestImage(
				movie.id,
				movie.poster_url,
				"posters",
				"poster_url",
			);

			await ingestImage(movie.id, movie.thumb_url, "thumbs", "thumb_url");
		}

		offset += pageSize;

		console.log(`Processed ${offset} rows`);
	}

	console.log("Migration complete");
}

async function ingestImage(id, url, folder, column) {
	if (!url) return;

	if (url.includes("r2.dev")) return;

	const key = `${folder}/${id}.jpg`;

	if (await exists(key)) {
		const newUrl = `${BASE}/${key}`;

		await supabase
			.from("movies")
			.update({ [column]: newUrl })
			.eq("id", id);

		console.log(`Already exists, updated DB: ${key}`);

		return;
	}

	const res = await fetch(url);

	if (!res.ok) {
		console.log(`Failed fetch: ${url}`);

		return;
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

	const newUrl = `${BASE}/${key}`;

	await supabase
		.from("movies")
		.update({ [column]: newUrl })
		.eq("id", id);

	console.log(`Uploaded ${key}`);
}

ingest();
