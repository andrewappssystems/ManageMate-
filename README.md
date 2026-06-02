# ManageMate Next

This is the Next.js migration of the original Express/EJS ManageMate app.

## Run It

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and set `DATABASE_URL`.

3. Create the database tables:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

4. Start the dev server:

```bash
npm run dev
```

Open `http://127.0.0.1:3001/login`.

## What Moved

- Express routes became Next route handlers under `src/app/api`.
- EJS pages became App Router pages under `src/app`.
- PostgreSQL access lives in `src/lib/db.js`.
- Cookie auth lives in `src/lib/auth.js`.
- The base database schema is now included in `database/schema.sql`.
