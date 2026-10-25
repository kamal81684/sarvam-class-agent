// Lesson generation pipeline:
// BuildPrompt -> OutlineAgent -> ContentAgent -> Discussion (Director + agents)
// -> AnalyseRegen -> RegenerateContent -> ActionAgent  (TTS happens in the browser)
import { chat, chatJSON } from "./llm.js";
import { AGENTS } from "./config.js";

export function buildPrompt(topic, notes) {
  let prompt = `Lesson topic: ${topic}`;
  if (notes) prompt += `\n\nSource notes from the instructor:\n${notes}`;
  return prompt;
}

export async function outlineAgent(session, feedback) {
  const system = `You are an expert curriculum designer. Create a lesson outline with 5-8 sections.
Each section has a short punchy title, a one-sentence description and 2-4 key points.
JSON shape: {"sections":[{"id":"s1","title":"...","description":"...","keyPoints":["..."]}]}`;
  let user = session.prompt;
  if (session.outline?.length && feedback) {
    user += `\n\nPrevious outline:\n${JSON.stringify(session.outline)}\n\nReviewer feedback (fix this): ${feedback}`;
  }
  const data = await chatJSON(system, user, 4000);
  return data.sections.map((s, i) => ({ ...s, id: `s${i + 1}` }));
}

const SLIDE_SYSTEM = `You build ONE presentation slide as a complete self-contained HTML document (inline <style> and <script>, no external assets).
Design: dark theme (#0f172a background, light text), 16:9, fills 100vw x 100vh, large readable text, no scrolling.
Make it visual and, where useful, interactive (simple diagram, steps, small simulation or quiz button).
Put data-ax="<short-id>" on 3-6 key elements (title, each key point, the diagram) so a narrator can highlight them.
Return ONLY the HTML document starting with <!DOCTYPE html>.`;

function cleanHtml(text) {
  const m = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  return (m ? m[1] : text).trim();
}

export async function generateSlide(session, section, extra = "") {
  const user = `Lesson: ${session.topic}
Section: ${section.title}
Description: ${section.description}
Key points: ${(section.keyPoints || []).join("; ")}${extra ? `\n\n${extra}` : ""}`;
  return cleanHtml(await chat(SLIDE_SYSTEM, user, 10000));
}

export async function contentAgent(session, feedback) {
  const extra = feedback ? `Reviewer feedback on the previous slides (apply it): ${feedback}` : "";
  const htmls = await Promise.all(session.outline.map((s) => generateSlide(session, s, extra)));
  return session.outline.map((s, i) => ({ id: s.id, title: s.title, html: htmls[i] }));
}

function transcript(messages) {
  return messages.map((m) => `${m.name}: ${m.text}`).join("\n");
}

export async function agentGenerate(session, agent) {
  const outline = session.outline.map((s) => `- ${s.title}: ${s.description}`).join("\n");
  const system = `You are ${agent.name}, a ${agent.role} in a classroom. Personality: ${agent.personality}
Stay in character. Reply with 2-4 sentences of natural classroom speech, no name prefix.`;
  const user = `Lesson: ${session.topic}\nOutline:\n${outline}\n\nDiscussion so far:\n${
    transcript(session.messages) || "(nobody has spoken yet)"
  }\n\nYour turn, ${agent.name}.`;
  return chat(system, user, 400);
}

// Director: one round-robin pass teacher -> students, then back to the human.
export async function discussionRound(session, humanMessage) {
  if (humanMessage) session.messages.push({ speaker: "human", name: "You", text: humanMessage });
  for (const agent of AGENTS) {
    const text = await agentGenerate(session, agent);
    session.messages.push({ speaker: agent.id, name: agent.name, text });
  }
}

export async function analyseRegen(session) {
  const system = `You review a lesson after a classroom discussion and decide which slides should be regenerated
because the discussion revealed confusion, missing examples or important details.
JSON shape: {"recommendations":[{"id":"s1","title":"...","reason":"...","recommended":true}]} with one entry per section.`;
  const user = `Sections:\n${session.outline.map((s) => `${s.id}: ${s.title} - ${s.description}`).join("\n")}
\nDiscussion:\n${transcript(session.messages) || "(no discussion)"}`;
  const data = await chatJSON(system, user, 3000);
  return data.recommendations;
}

export async function regenerateContent(session, ids) {
  const summary = transcript(session.messages).slice(-4000);
  await Promise.all(
    session.slides.map(async (slide) => {
      if (!ids.includes(slide.id)) return;
      const section = session.outline.find((s) => s.id === slide.id);
      const reason = session.regenAnalysis?.find((r) => r.id === slide.id)?.reason || "";
      slide.previousHtml = slide.html;
      slide.html = await generateSlide(
        session,
        section,
        `Improve this slide using the classroom discussion. Why: ${reason}\nDiscussion:\n${summary}`
      );
      slide.regenerated = true;
    })
  );
}

function anchors(html) {
  return [...html.matchAll(/data-ax=["']([^"']+)["']/g)].map((m) => m[1]);
}

export async function actionAgent(session) {
  await Promise.all(
    session.slides.map(async (slide) => {
      const targets = [...new Set(anchors(slide.html))];
      const system = `You are Dr. Smith, a teacher narrating a slide. Write 3-6 ordered presentation actions.
Each action highlights one element (target = one of the available ids, or "" for none) while you say 1-3 sentences.
JSON shape: {"actions":[{"target":"title","narration":"..."}]}`;
      const user = `Slide: ${slide.title}\nAvailable targets: ${targets.join(", ") || "(none)"}\n\nSlide HTML (for context):\n${slide.html.slice(0, 6000)}`;
      try {
        const data = await chatJSON(system, user, 3000);
        slide.actions = data.actions.map((a) => ({
          target: targets.includes(a.target) ? a.target : "",
          narration: a.narration,
        }));
      } catch {
        slide.actions = [{ target: "", narration: `Let's take a look at ${slide.title}.` }];
      }
    })
  );
}
