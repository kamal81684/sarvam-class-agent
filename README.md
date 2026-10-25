# Sarvam Class Agent

Simple Node/Express + Next.js AI classroom agent. Every AI call goes to Sarvam:
chat uses `sarvam-105b` and narration uses `bulbul:v3`.

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
| GET | `/api/tts?text=...` | mp3 narration |
