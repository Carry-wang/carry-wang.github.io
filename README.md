# Baojie Wang — Academic Website

A white-and-blue, two-column academic homepage for Baojie Wang, a Master's student at Zhejiang University. The redesign includes a sticky profile, section navigation, publications, research experience, education, and the existing EvoPatient project.

## Publication status

This branch contains the approved design preview. Pushing this branch does **not** deploy it or reactivate GitHub Pages. The page keeps its “Local preview · Not published” notice and `noindex, nofollow` metadata until a separate publication decision is made. Existing live-site state is not changed by this branch.

## Local preview

From the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`. All essential content and links also work without JavaScript.

## Browser checks

Install Playwright in your development environment without committing downloaded dependencies:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node --test tests/homepage.test.cjs
```

For an already installed browser, set `CHROME_EXECUTABLE` to its executable path. Tests cover content, local assets, no external background requests, desktop/mobile layout, navigation, keyboard access, paper figure dialog, and no-JavaScript fallback.

## Public content and privacy

Content and image assets are retained from the existing public homepage. No private résumé details, phone number, portrait, analytics, forms, trackers, remote fonts, or embedded external pages are added. External sites are contacted only when their ordinary links are followed. BW is a typographic placeholder, not a photograph.

Layout inspiration: https://xiaodu-flying.github.io/. Its personal content, identity, and publications are not reused.

## Asset attribution

Institution marks identify affiliations only and do not imply endorsement. All marks and the existing RoleMotion figure are stored locally under `assets/images/`.
