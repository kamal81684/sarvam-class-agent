"use client";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Player from "@/components/Player";
import SlideFrame from "@/components/SlideFrame";
import "../../teacher.css";

const STEPS = [
  { stage: "outline_review", label: "Outline" },
  { stage: "content_review", label: "Slides" },
  { stage: "discussion", label: "Discussion" },
  { stage: "regen_review", label: "Improve" },
  { stage: "done", label: "Ready" },
];

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

  if (!s)
    return error ? <p className="error">{error}</p> : <div className="loading"><span className="spinner" /> Loading lesson...</div>;

  const current = STEPS.findIndex((st) => st.stage === s.stage);

  return (
    <>
      <div className="card">
        <div className="card-header" style={{ marginBottom: 0 }}>
          <div>
            <p className="muted" style={{ marginBottom: 2 }}>Lesson</p>
            <h2 style={{ margin: 0 }}>{s.topic}</h2>
          </div>
          {s.stage === "done" && <a className="btn secondary" href={`/learn/${s.id}`}>Open as student</a>}
        </div>
        <div className="stepper">
          {STEPS.map((st, i) => (
            <div key={st.stage} style={{ display: "contents" }}>
              {i > 0 && <div className={`step-line ${i <= current ? "done" : ""}`} />}
              <div className={`step ${i < current || s.stage === "done" ? "done" : i === current ? "current" : ""}`}>
                <span className="step-dot">{i < current || s.stage === "done" ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                <span className="step-label">{st.label}</span>
              </div>
            </div>
          ))}
        </div>
        {busy && <div className="loading" style={{ marginTop: 18 }}><span className="spinner" /> {busy}... this can take a minute</div>}
        {error && <p className="error">{error}</p>}
      </div>

      {s.stage === "outline_review" && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0 }}>Review the outline</h3>
            <span className="badge primary">{s.outline.length} sections</span>
          </div>
          <div className="sections">
            {s.outline.map((sec, i) => (
              <div className="section-card" key={sec.id}>
                <span className="section-num">{i + 1}</span>
                <div>
                  <h4>{sec.title}</h4>
                  <p className="muted" style={{ margin: 0 }}>{sec.description}</p>
                  {sec.keyPoints?.length > 0 && (
                    <div className="chips">{sec.keyPoints.map((k) => <span className="chip" key={k}>{k}</span>)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Gate busy={busy} feedback={feedback} setFeedback={setFeedback} rejects={s.rejectCount}
            approveLabel="Approve & build slides"
            onApprove={() => run("Generating slides", "/outline", { approve: true })}
            onReject={() => run("Rewriting outline", "/outline", { approve: false, feedback })} />
        </div>
      )}

      {s.stage === "content_review" && (
        <div className="card">
          <h3>Review the slides</h3>
          <SlideTabs slides={s.slides} />
          <Gate busy={busy} feedback={feedback} setFeedback={setFeedback} rejects={s.rejectCount}
            approveLabel="Approve & start discussion"
            onApprove={() => run("Starting discussion", "/content", { approve: true })}
            onReject={() => run("Regenerating slides", "/content", { approve: false, feedback })} />
          <PublishNow busy={busy} run={run} />
        </div>
      )}

      {s.stage === "discussion" && (
        <div className="card">
          <h3>Classroom discussion</h3>
          <p className="muted">Dr. Smith, Alex and Maya discuss the lesson. Join in, or pass your turn.</p>
          <div className="chat">
            {s.messages.length === 0 && <p className="empty">Nobody has spoken yet. Start the discussion.</p>}
            {s.messages.map((m, i) => {
              const kind = m.speaker === "human" ? "me" : m.speaker === "teacher" ? "teacher" : "student";
              const initials = m.name.split(/[\s.]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div className={`bubble-row ${kind === "me" ? "me" : ""}`} key={i}>
                  <span className={`avatar ${kind}`}>{initials}</span>
                  <div className={`bubble ${kind}`}>
                    <span className="who">{m.name}</span>
                    {m.text}
                  </div>
                </div>
              );
            })}
          </div>
          <label className="field" htmlFor="msg">Your message</label>
          <textarea id="msg" rows={2} placeholder="Ask a question or add a point (leave empty to pass)" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <div className="btn-row">
            <button disabled={!!busy} onClick={() => run("Agents are talking", "/discuss", { message: feedback })}>
              {feedback ? "Speak" : s.messages.length ? "Pass turn" : "Start discussion"}
            </button>
            <button className="secondary" disabled={!!busy} onClick={() => run("Analysing discussion", "/end-discussion", {})}>
              End discussion
            </button>
          </div>
          <PublishNow busy={busy} run={run} />
        </div>
      )}

      {s.stage === "regen_review" && <RegenPicker s={s} busy={busy} run={run} />}

      {s.stage === "done" && <Player slides={s.slides} />}
    </>
  );
}

function Gate({ busy, feedback, setFeedback, rejects, approveLabel, onApprove, onReject }) {
  return (
    <div className="gate">
      <label className="field" htmlFor="fb">Feedback <span className="muted">(only needed to reject)</span></label>
      <textarea id="fb" rows={2} placeholder="What should change?" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      <div className="btn-row">
        <button disabled={!!busy} onClick={onApprove}>{approveLabel || "Approve"}</button>
        <button className="secondary" disabled={!!busy || !feedback} onClick={onReject}>Reject & regenerate</button>
        <span className="badge">Rejections {rejects}/3</span>
      </div>
    </div>
  );
}

function SlideTabs({ slides }) {
  const [i, setI] = useState(0);
  return (
    <>
      <div className="pills">
        {slides.map((sl, k) => (
          <button key={sl.id} className={`pill ${k === i ? "active" : ""}`} onClick={() => setI(k)}>
            <span className="num">{k + 1}.</span> {sl.title}
          </button>
        ))}
      </div>
      <SlideFrame html={slides[i]?.html} />
    </>
  );
}

function RegenPicker({ s, busy, run }) {
  const [picked, setPicked] = useState(s.regenAnalysis.filter((r) => r.recommended).map((r) => r.id));
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <div className="card">
      <h3>Improve slides from the discussion</h3>
      <p className="muted" style={{ marginBottom: 16 }}>Recommended slides are pre-selected. Narration is written for every slide when you finish.</p>
      <div className="check-cards">
        {s.regenAnalysis.map((r) => (
          <label key={r.id} className={`check-card ${picked.includes(r.id) ? "on" : ""}`}>
            <input type="checkbox" checked={picked.includes(r.id)} onChange={() => toggle(r.id)} />
            <div>
              <b>{r.title} {r.recommended && <span className="badge yellow">Recommended</span>}</b>
              <span className="muted">{r.reason}</span>
            </div>
          </label>
        ))}
      </div>
      <button disabled={!!busy} onClick={() => run("Regenerating slides and writing narration", "/regenerate", { sectionIds: picked })}>
        {picked.length ? `Regenerate ${picked.length} slide${picked.length > 1 ? "s" : ""} & finish` : "Skip & finish"}
      </button>
    </div>
  );
}

// Shortcut: write narration now and make the lesson visible to students as "Ready".
function PublishNow({ busy, run }) {
  return (
    <div className="publish-now">
      <span className="muted">In a hurry? Skip the discussion and publish these slides with narration.</span>
      <button className="yellow" disabled={!!busy} onClick={() => run("Writing narration and publishing", "/publish", {})}>
        Publish to students
      </button>
    </div>
  );
}
