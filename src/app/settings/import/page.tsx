import { permanentRedirect } from "next/navigation";

/**
 * The importer used to live here, as a Settings sub-page. It's now a
 * first-class entry path at `/import` (src/app/import/page.tsx) with its own
 * promise — "bring your Letterboxd history, keep your Letterboxd account" —
 * because it's the one surface that converts someone who already logs films
 * elsewhere without asking them to switch.
 *
 * **The real redirect lives in next.config.js**, not here. This page cannot
 * do the job on its own: it prerenders as static (`○` in the build output),
 * and a static page can't emit a runtime 308 — Next bakes `permanentRedirect`
 * into an RSC payload that only the client router acts on. Measured against
 * production before the config rule was added, `/settings/import` returned
 * HTTP 200 with zero redirects: browsers landed on `/import` via the router,
 * but crawlers and non-JS clients got an app shell, and none of the old
 * path's SEO signal transferred.
 *
 * Config redirects are matched before filesystem routing, so this file is now
 * unreachable in any deployed environment. It's kept as a working fallback in
 * case that rule is ever removed, and because the old path is linked from the
 * comparison guide, onboarding, and whatever users bookmarked. Delete the
 * config rule OR this file, never assume both are load-bearing at once.
 */
export default function SettingsImportRedirect() {
  permanentRedirect("/import");
}
