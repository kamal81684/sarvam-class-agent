"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Player from "./Player";

const STAGES = {
  outline_review: "1. Review outline",
  content_review: "2. Review slides",
  discussion: "3. Classroom discussion",
  regen_review: "4. Pick slides to improve",
  done: "5. Lesson ready",
};

export default function SessionPage({ params }) {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    api(`/sessions/${params.id}`).then(setS).catch((e) => setError(e.message));
  }, [params.id]);

  async function run(label, path, body) {
    setBusy(label);
    setError("");
    try {
      setS(await api(`/sessions/${params.id}${path}`, body));
      setFeedback("");
    } catch (e) {
      setError(e.message);
    }
    setBusy("");
  }

  if (!s) return <p>{error || "Loading..."}</p>;

  return (
    <>
      <div className="card">
        <h2 style={{ margin: 0 }}>{s.topic}</h2>
        <p className="muted">{STAGES[s.stage]}</p>
        {busy && <p>⏳ {busy}... (this can take a minute)</p>}
        {error && <p className="error">{error}</p>}
      </div>

      {s.stage === "outline_review" && (
        <div className="card">
          <h3>Outline</h3>
          <ol>
            {s.outline.map((sec) => (
              <li key={sec.id}>
                <b>{sec.title}</b> — {sec.description}
                <ul>{sec.keyPoints?.map((k) => <li key={k} className="muted">{k}</li>)}</ul>
              </li>
            ))}
          </ol>
          <Gate busy={busy} feedback={feedback} setFeedback={setFeedback} rejects={s.rejectCount}
            onApprove={() => run("Generating slides", "/outline", { approve: true })}
            onReject={() => run("Rewriting outline", "/outline", { approve: false, feedback })} />
        </div>
      )}

      {s.stage === "content_review" && (
        <div className="card">
          <h3>Slides</h3>
          <SlideTabs slides={s.slides} />
          <Gate busy={busy} feedback={feedback} setFeedback={setFeedback} rejects={s.rejectCount}
            onApprove={() => run("Starting discussion", "/content", { approve: true })}
            onReject={() => run("Regenerating slides", "/content", { approve: false, feedback })} />
        </div>
      )}

      {s.stage === "discussion" && (
        <div className="card">
          <h3>Classroom discussion</h3>
          <p className="muted">Dr. Smith, Alex and Maya discuss the lesson. Say something or pass your turn.</p>
          {s.messages.map((m, i) => (
            <div className="msg" key={i}><b>{m.name}:</b>{m.text}</div>
          ))}
          <textarea rows={2} placeholder="Your message (leave empty to pass)" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <button disabled={!!busy} onClick={() => run("Agents are talking", "/discuss", { message: feedback })}>
            {feedback ? "Speak" : s.messages.length ? "Pass" : "Start discussion"}
          </button>
          <button className="secondary" disabled={!!busy} onClick={() => run("Analysing discussion", "/end-discussion", {})}>
            End discussion
          </button>
        </div>
      )}

      {s.stage === "regen_review" && <RegenPicker s={s} busy={busy} run={run} />}

      {s.stage === "done" && <Player slides={s.slides} />}
    </>
  );
}

function Gate({ busy, feedback, setFeedback, rejects, onApprove, onReject }) {
  return (
    <>
      <textarea rows={2} placeholder="Feedback if rejecting" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      <button disabled={!!busy} onClick={onApprove}>Approve</button>
      <button className="secondary" disabled={!!busy || !feedback} onClick={onReject}>Reject & regenerate</button>
      <span className="muted">Rejections: {rejects}/3</span>
    </>
  );
}

function SlideTabs({ slides }) {
  const [i, setI] = useState(0);
  return (
    <>
      <div className="tabs">
        {slides.map((sl, k) => (
          <button key={sl.id} className={k === i ? "" : "secondary"} onClick={() => setI(k)}>{k + 1}. {sl.title}</button>
        ))}
      </div>
      <iframe className="slide" sandbox="allow-scripts" srcDoc={slides[i]?.html} />
    </>
  );
}

function RegenPicker({ s, busy, run }) {
  const [picked, setPicked] = useState(s.regenAnalysis.filter((r) => r.recommended).map((r) => r.id));
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <div className="card">
      <h3>Which slides should be improved from the discussion?</h3>
      <ul className="list">
        {s.regenAnalysis.map((r) => (
          <li key={r.id}>
            <label>
              <input type="checkbox" style={{ width: "auto", marginRight: 8 }} checked={picked.includes(r.id)} onChange={() => toggle(r.id)} />
              <b>{r.title}</b> <span className="muted">— {r.reason}</span>
            </label>
          </li>
        ))}
      </ul>
      <br />
      <button disabled={!!busy} onClick={() => run("Regenerating slides and writing narration", "/regenerate", { sectionIds: picked })}>
        {picked.length ? `Regenerate ${picked.length} & finish` : "Skip & finish"}
      </button>
    </div>
  );
}
