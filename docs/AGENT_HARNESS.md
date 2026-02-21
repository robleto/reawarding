# Reawarding Agent Harness (Pre-login)

This harness validates core pre-login behavior using Playwright.

## Included checks

1. Home loads and shows the headline.
2. Primary CTA navigates to `/login`.
3. Dark mode toggle works across pre-login pages (`/` and `/login`).

## Run locally

```bash
npm run test:e2e
```

`test:e2e` starts the app via Playwright `webServer` using:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

## Full agent gate

```bash
npm run agent:check
```

This runs:

1. `npm run build`
2. `npm run lint`
3. `npm run test:e2e`
