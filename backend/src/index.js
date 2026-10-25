import express from "express";
import cors from "cors";
import * as store from "./store.js";
import * as P from "./pipeline.js";
import { MAX_REJECTS } from "./config.js";
import { tts } from "./tts.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Wrap a handler: load the session, run it, save, return it.
const withSession = (fn) => async (req, res) => {
  const session = store.load(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  try {
    await fn(session, req.body || {});
    session.error = null;
    res.json(store.save(session));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/sessions", (_req, res) => res.json(store.list()));
app.get("/api/sessions/:id", (req, res) => {
  const s = store.load(req.params.id);
  s ? res.json(s) : res.status(404).json({ error: "Session not found" });
});

// BuildPrompt + OutlineAgent
app.post("/api/sessions", async (req, res) => {
  const { topic, notes } = req.body || {};
  if (!topic) return res.status(400).json({ error: "topic is required" });
  const session = {
    id: store.newId(),
    topic,
    prompt: P.buildPrompt(topic, notes),
    stage: "outline_review",
    rejectCount: 0,
    outline: [],
    slides: [],
    messages: [],
    createdAt: new Date().toISOString(),
  };
  try {
    session.outline = await P.outlineAgent(session);
    res.json(store.save(session));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// hitl_outline: approve -> ContentAgent, reject -> OutlineAgent with feedback
app.post(
  "/api/sessions/:id/outline",
  withSession(async (s, { approve, feedback }) => {
    if (approve || s.rejectCount >= MAX_REJECTS) {
      s.rejectCount = 0;
      s.slides = await P.contentAgent(s);
      s.stage = "content_review";
    } else {
      s.rejectCount++;
      s.outline = await P.outlineAgent(s, feedback);
    }
  })
);

// hitl_content: approve -> discussion, reject -> ContentAgent with feedback
app.post(
  "/api/sessions/:id/content",
  withSession(async (s, { approve, feedback }) => {
    if (approve || s.rejectCount >= MAX_REJECTS) {
      s.rejectCount = 0;
      s.stage = "discussion";
    } else {
      s.rejectCount++;
      s.slides = await P.contentAgent(s, feedback);
    }
  })
);

// Director + AgentGenerate: human speaks (or passes), every agent replies once
app.post(
  "/api/sessions/:id/discuss",
  withSession(async (s, { message }) => {
    await P.discussionRound(s, message?.trim());
  })
);

// End discussion -> AnalyseRegen -> hitl_regen_sections
app.post(
  "/api/sessions/:id/end-discussion",
  withSession(async (s) => {
    s.regenAnalysis = await P.analyseRegen(s);
    s.stage = "regen_review";
  })
);

// RegenerateContent (selected sections) -> ActionAgent -> done
app.post(
  "/api/sessions/:id/regenerate",
  withSession(async (s, { sectionIds = [] }) => {
    if (sectionIds.length) await P.regenerateContent(s, sectionIds);
    await P.actionAgent(s);
    s.stage = "done";
  })
);

// TTSAgent: Sarvam bulbul narration, cached in memory
const audioCache = new Map();
app.get("/api/tts", async (req, res) => {
  const text = String(req.query.text || "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });
  try {
    if (!audioCache.has(text)) audioCache.set(text, await tts(text));
    res.set("Content-Type", "audio/mpeg").send(audioCache.get(text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8095;
const server = app.listen(PORT, () => console.log(`sarvam-class-agent backend on http://localhost:${PORT}`));
server.requestTimeout = 0; // slide generation can take a few minutes
