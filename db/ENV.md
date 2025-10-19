# Environment setup (Supabase)

Because `.env*` files are ignored by this repository, create a local `.env.local` in your project root manually.

Place the following values (replace only if you rotate keys):

```bash
# Client-exposed (safe to expose in browser)
NEXT_PUBLIC_SUPABASE_URL=https://muvvovkkyforjefxvqxt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dnZvdmtreWZvcmplZnh2cXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NzE5NDEsImV4cCI6MjA3NTE0Nzk0MX0.4bp416a_jjPTz9MK-bYOOjMaUuUoxXzMXfddRGC4PTs

# Server-only (NEVER expose to the browser; do not prefix with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11dnZvdmtreWZvcmplZnh2cXh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3MTk0MSwiZXhwIjoyMDc1MTQ3OTQxfQ.3U3BjilB_dbYl2yf9vej6aZ19bcpUxZ_LB2E8UHarbk

# Optional conveniences
SUPABASE_AVATARS_BUCKET=avatars
```

Notes
- `NEXT_PUBLIC_` vars are available to the browser (Next.js convention).
- `SUPABASE_SERVICE_ROLE_KEY` must be used only on the server (API routes, edge/server actions). Never ship it to the client.
- Project Ref: `muvvovkkyforjefxvqxt` → URL `https://muvvovkkyforjefxvqxt.supabase.co`.

After creating `.env.local`, restart the dev server:

```bash
npm run dev
```
