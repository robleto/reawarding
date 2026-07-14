// Safe UUID generation that works in all runtime contexts.
//
// `crypto.randomUUID()` is only exposed in secure contexts (HTTPS or
// localhost) and in modern browsers/Node versions. When the app is served
// over plain HTTP (e.g. testing on a LAN IP) or in older browsers, calling
// it throws "crypto.randomUUID is not a function". This helper prefers the
// native implementation and falls back to a `crypto.getRandomValues`-based
// UUIDv4, and finally to Math.random if crypto is entirely unavailable.

export function generateUUID(): string {
	const cryptoObj: Crypto | undefined =
		typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

	// Preferred: native randomUUID (secure contexts, modern runtimes).
	if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
		return cryptoObj.randomUUID();
	}

	// Fallback: RFC 4122 v4 UUID built from crypto.getRandomValues.
	if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
		const bytes = new Uint8Array(16);
		cryptoObj.getRandomValues(bytes);
		bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
		bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
		const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
		return (
			hex.slice(0, 4).join("") +
			"-" +
			hex.slice(4, 6).join("") +
			"-" +
			hex.slice(6, 8).join("") +
			"-" +
			hex.slice(8, 10).join("") +
			"-" +
			hex.slice(10, 16).join("")
		);
	}

	// Last resort: non-cryptographic random id in UUID shape.
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}
