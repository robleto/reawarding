import { permanentRedirect } from "next/navigation";

/**
 * The importer used to live here, as a Settings sub-page. It's now a
 * first-class entry path at `/import` (src/app/import/page.tsx) with its own
 * promise — "bring your Letterboxd history, keep your Letterboxd account" —
 * because it's the one surface that converts someone who already logs films
 * elsewhere without asking them to switch.
 *
 * This stub stays permanently: the old path has been linked from the
 * comparison guide, onboarding, and anywhere users bookmarked it, and a 308
 * keeps every one of those working (and passes SEO signal to the new route).
 */
export default function SettingsImportRedirect() {
  permanentRedirect("/import");
}
