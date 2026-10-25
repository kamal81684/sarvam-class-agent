# Sarvam Class Agent

Visual overview of features, flows and roadmap: [docs/roadmap.html](docs/roadmap.html) (open it in a browser).

Simple Node/Express + Next.js AI classroom agent. Every AI call goes to Sarvam:

| Use | Sarvam API |
|---|---|
| Outline, slides, discussion, narration, doubt answers | Chat `sarvam-105b` |
| Narration and spoken answers | TTS `bulbul:v3` |
| Voice doubts | STT `saaras:v3` |
| Photo doubts | Document AI (Sarvam Vision) |

Two sides: **Teacher Studio** (`/`) builds lessons, and **Student** (`/learn`) plays finished lessons with an
**Ask doubt** panel. Students can type, speak in any Indian language, or upload a photo of the question. They
get an answer in the same language that is aware of the current slide, and can listen to it.

Pipeline (same steps as the LangGraph version, each gate approved in the UI):

1. **BuildPrompt + OutlineAgent**: topic (+ optional notes) → 5-8 sections → approve / reject with feedback (max 3)
2. **ContentAgent**: one self-contained HTML slide per section, generated in parallel → approve / reject
3. **Director + agents**: Dr. Smith, Alex and Maya discuss the lesson in turn; you speak or pass
4. **AnalyseRegen**: recommends which slides to improve from the discussion; you pick them
5. **RegenerateContent + ActionAgent**: rewrites the picked slides and writes narration steps that highlight `data-ax` elements
6. **TTS**: Sarvam audio is streamed per step in the player

## Run

```bash
# backend (http://localhost:8095)
cd sarvam-class-agent/backend && cp .env.example .env   # set SARVAM_API_KEY
npm install && npm run dev

# frontend (http://localhost:3010)
cd sarvam-class-agent/frontend && npm install && npm run dev
```

Sessions are saved as JSON files in `backend/sessions/`.

## Deploy the backend (Render)

- Root directory: `backend` · Build: `yarn install` · Start: `yarn start`
- `.env` is not committed, so set these under **Environment** in Render:
  `SARVAM_API_KEY`, `LLM_MODEL=sarvam-105b`, `TTS_MODEL=bulbul:v4-flash`, `TTS_VOICE=kalpit_en_edtech`,
  `TTS_LANGUAGE=en-IN`, `TTS_PACE=0.9`, `STT_MODEL=saaras:v3` (Render sets `PORT` itself)
- Point the frontend at it with `NEXT_PUBLIC_API_URL=https://<your-service>.onrender.com`
- The free plan's disk is wiped on every deploy/restart, so lessons in `sessions/` don't persist there.

## API

| Method | Path | Step |
|---|---|---|
| GET | `/api/sessions`, `/api/sessions/:id` | list / get |
| POST | `/api/sessions` `{topic, notes}` | outline |
| POST | `/api/sessions/:id/outline` `{approve, feedback}` | approve → slides |
| POST | `/api/sessions/:id/content` `{approve, feedback}` | approve → discussion |
| POST | `/api/sessions/:id/discuss` `{message}` | one discussion round |
| POST | `/api/sessions/:id/end-discussion` | regen analysis |
| POST | `/api/sessions/:id/regenerate` `{sectionIds}` | regen + narration → done |
| GET | `/api/tts?text=...&lang=hi-IN` | mp3 narration |
| POST | `/api/stt` `{audio (base64), mime}` | voice → `{transcript, language}` |
| POST | `/api/sessions/:id/doubts` `{question, slideId, language, image?: {data, name, mime}}` | student doubt → answer |
