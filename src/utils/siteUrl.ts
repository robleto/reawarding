const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

export const getSiteUrl = () => {
	if (envSiteUrl) {
		return envSiteUrl;
	}
	if (typeof window !== "undefined") {
		return window.location.origin;
	}
	return "";
};

export const buildSiteUrl = (path: string) => {
	const base = getSiteUrl();
	if (!path) {
		return base;
	}
	return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};
