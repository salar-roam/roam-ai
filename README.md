# Roam AI – Smart Event Assistant (MVP)

This repository contains the minimal code & SQL needed to launch the chat‑only Roam AI assistant on Vercel + Supabase.

## Quick deploy

1. **Fork** this repo → open with **GitHub Codespaces**.
2. **Create** a Supabase project → enable `pgvector` & `postgis`.
3. Copy `sql/init.sql` into Supabase **SQL editor** → **Run**.
4. Add secrets in GitHub → Settings → Secrets → Actions:

```
SUPABASE_URL          = https://PROJECT.ref.supabase.co
SUPABASE_ANON_KEY     = ... (anon public key)
OPENAI_API_KEY        = sk-...
RECAPTCHA_SITE_KEY    = ...
RECAPTCHA_SECRET      = ...
```

5. **Import** repo into **Vercel** → click **Deploy**.
6. Open your new URL and start chatting 🎉

## Project structure

```
sql/init.sql         # full schema + seed data
lib/supabase.ts      # Supabase client
pages/api/chat.ts    # unified chat endpoint
pages/api/publish.ts # final commit to DB
.env.example         # environment variables template
```

## License

MIT
