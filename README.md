# Achievers — Step 1: Skill Fingerprint

Students upload a CV, the app matches it to a skills taxonomy (no AI, every match traceable to a sentence), shows a skill tree against a target role, and collects peer evidence through referee links ("Meet me through others").

Stack: Vite (plain JavaScript) · Supabase (auth, Postgres, file storage) · Netlify (hosting).

## Run locally

```bash
npm install
cp .env.example .env    # optional: without it the app runs in guest mode
npm run dev
```

## Deploy (about 10 minutes)

### 1. Supabase
1. Create a project at supabase.com (free tier).
2. **SQL Editor → New query** → paste `supabase/schema.sql` → **Run**.
3. **Authentication → Providers → Email**: for the demo, turn **Confirm email** off so sign-up logs people in immediately.
4. **Project Settings → API**: copy the **Project URL** and the **anon public** key.

### 2. Netlify
1. **Add new site → Import an existing project** → pick this GitHub repo.
2. Build command `npm run build`, publish directory `dist` (already in `netlify.toml`).
3. **Site configuration → Environment variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Then in Supabase **Authentication → URL Configuration**, set the Site URL to your Netlify address.

## Where things live

| Path | What it is |
|---|---|
| `data/taxonomy.json` | Skill tree: category → sub-category → skill |
| `data/aliases.json` | Phrases that count as evidence for each skill (edit to improve matching) |
| `data/roles.json` | Target roles and the level (1–5) each needs per skill |
| `src/match.js` | Matching rules and evidence levels |
| `src/store.js` | Database access (Supabase or guest/localStorage) |
| `supabase/schema.sql` | Tables, row-level security, referee functions, CV bucket |

## How evidence levels work

- **1** skill mentioned · **2** done with ownership (led, built, organised…) · **3** with a measurable result (numbers, %).
- CV and self-reported evidence stop at 3. +1 when the skill shows up in 3+ places, +1 when a second kind of source (peer, test) confirms it. Max 5.
- No overall score is ever calculated.

## Data sources

The taxonomy follows the structure of Canada's **Skills and Competencies Taxonomy** (ESDC) and role levels will come from **OaSIS 2025** ratings (Open Government Licence – Canada). Until the official CSVs are imported, `taxonomy.json` and `roles.json` are marked `"source": "seed"` and the app says so on the role card.
