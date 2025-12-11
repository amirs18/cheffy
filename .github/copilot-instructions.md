## Purpose
These instructions help AI coding agents be immediately productive in the Cheffy codebase (Next.js + Prisma + AI integrations). Focus on actionable, repository-specific knowledge: architecture, run/build steps, conventions, integration points, and examples.

## Quick start (commands)
- Dev server: `npm run dev` (uses `next dev`).
- Build: `npm run build` (runs `prisma generate` then `next build`).
- Start: `npm run start` (production server).
- Lint: `npm run lint`.

Environment notes:
- Required: `DATABASE_URL` (MongoDB), `ANAM_API_KEY`, `ANAM_AVATAR_ID`, `ELEVENLABS_AGENT_ID`, and `GOOGLE_GENERATIVE_AI_API_KEY` for recipe generation. Check `app/api/anam/config/route.ts` and `app/api/recipes/generate/route.ts` for usage.

## Big-picture architecture
- Frontend: Next.js App Router under `app/` (server components by default). Interactive UI lives in client wrappers such as [app/components/client-wrapper.tsx](app/components/client-wrapper.tsx).
- API: Route handlers in `app/api/**/route.ts` (examples: conversations and recipes). They are server-only and often use Clerk auth (`@clerk/nextjs/server`). See [app/api/conversations/route.ts](app/api/conversations/route.ts).
- Database: Prisma with MongoDB (`prisma/schema.prisma`). The shared helpers live in `lib/` (notably `lib/prisma.ts` and `lib/db.ts`). Use `lib/db.ts` helpers (`saveConversation`, `getConversation`, `saveRecipe`, etc.) instead of ad-hoc Prisma calls when possible.
- External AI & services:
  - Anam (avatar/session token): `app/api/anam/config/route.ts`.
  - ElevenLabs WebSocket integration: `lib/elevenlabs.ts`.
  - Google Generative AI via `@ai-sdk/google` and `ai` SDK in `app/api/recipes/generate/route.ts` (model: `gemini-2.5-flash`).

## Project-specific conventions & patterns
- Prefer Next.js server components; add 'use client' at top of client files (see `app/components/client-wrapper.tsx`).
- Centralized DB helpers: use `lib/db.ts` for conversation/recipe operations to keep error handling and logging consistent.
- API route error handling: handlers return `NextResponse.json(...)` with `{ error: ... }` and log details. Preserve this pattern when editing or adding routes.
- LLM prompts: follow the project's strict prompt patterns. Example: recipe generation enforces `CRITICAL: Return ONLY valid JSON.` If editing prompts, do not change this guarantee unless you update parsing logic in `app/api/recipes/generate/route.ts`.
- Schema-driven data: Prisma models (Conversation, Message, Recipe) are authoritative. New fields should be added to `prisma/schema.prisma` and generated with `prisma generate` before builds.

## Integration and secrets
- DB: `lib/prisma.ts` lazy-initializes `PrismaClient` and logs DB connection in development — set `DATABASE_URL` and verify connection errors there.
- Auth: Clerk (`@clerk/nextjs`) is used server-side (`auth()` in API routes) — preserve `userId` checks to authorize requests.
- Anam & ElevenLabs: `app/api/anam/config/route.ts` issues Anam session tokens and returns `elevenLabsAgentId`. ElevenLabs connection is implemented in `lib/elevenlabs.ts` (WebSocket + mic capture).

## Code examples & where to change things
- To add a new API route: create `app/api/<name>/route.ts` and follow the patterns in `app/api/conversations/route.ts` (auth, validation, call `lib/db.ts`).
- To call the AI model consistently: see `app/api/recipes/generate/route.ts` — model selection, prompt construction, parsing JSON from the model output, and robust error mapping are important to copy.
- To add client UI that interacts with conversations, wrap interactive components in a client wrapper like [app/components/client-wrapper.tsx](app/components/client-wrapper.tsx) and use `ConversationSidebar` + `Conversation` patterns.

## Testing, debugging, and common pitfalls
- Local dev: run `npm run dev`. If Prisma fails during build, run `npx prisma generate` and ensure `DATABASE_URL` is set.
- Parsing LLM output: code expects raw JSON (parsing includes stripping markdown fences). If prompts change, update parsing in `app/api/recipes/generate/route.ts`.
- Logs: server-side routes and `lib/db.ts` log detailed errors; check terminal for `console.error` output and the DB connection logs from `lib/prisma.ts`.

## When editing AI-related code
- Keep prompt contracts stable (e.g., “Return ONLY valid JSON”) or add defensive parsing.
- Preserve rate-limit and transient error handling patterns (503, 429 mapping) in `app/api/recipes/generate/route.ts`.

## Quick file map (start here)
- App entry & pages: [app/page.tsx](app/page.tsx)
- Key UI components: [app/components/client-wrapper.tsx](app/components/client-wrapper.tsx), [app/components/conversation.tsx](app/components/conversation.tsx)
- API examples: [app/api/conversations/route.ts](app/api/conversations/route.ts), [app/api/recipes/generate/route.ts](app/api/recipes/generate/route.ts), [app/api/anam/config/route.ts](app/api/anam/config/route.ts)
- DB & models: [lib/db.ts](lib/db.ts), [lib/prisma.ts](lib/prisma.ts), [prisma/schema.prisma](prisma/schema.prisma)

If anything above is unclear or you want more examples (tests, a new API route scaffold, or prompt tuning changes), tell me which area to expand and I will iterate.

## Examples

- Minimal API route scaffold (follow patterns in `app/api/conversations/route.ts`):

```ts
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { saveRecipe } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  // validate body... then call shared DB helper
  const saved = await saveRecipe(userId, body);
  return NextResponse.json({ success: true, recipe: saved }, { status: 201 });
}
```

- Prompt template excerpt (used in `app/api/recipes/generate/route.ts`):

```
You are a professional chef and recipe creator.
CRITICAL: Return ONLY valid JSON. Do NOT include markdown fences or extra text.

Required JSON structure:
{
  "title": "...",
  "ingredients": [...],
  "instructions": [...]
}
```

- Example DB helper usage: call `saveConversation(userId, messages, title)` or `addMessageToConversation(id, role, content)` from `lib/db.ts` — helpers log errors and normalize behavior across the app.

---

If you'd like, I can now generate a small scaffold for a new API endpoint, or run the project lint/build to validate these files.
