"use client";
import { Sheet, Code2, Database, Bot, TrendingUp, BarChart3, Brain, Smartphone, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import "./teacher.css";

const STAGE_NAMES = {
  outline_review: "Outline review",
  content_review: "Slide review",
  discussion: "Discussion",
  regen_review: "Improve slides",
  done: "Ready",
};

// Starter course ideas shown under the Topic field; clicking one fills the form.
const SUGGESTIONS = [
  { icon: Sheet, topic: "Introduction to Data Analytics with Excel", notes: "Audience: college students new to analytics. Cover data cleaning, formulas, pivot tables and charts with a sales dataset example." },
  { icon: Code2, topic: "Python for Beginners: Variables, Loops and Functions", notes: "Audience: first-time programmers. Use small runnable examples and a mini project at the end." },
  { icon: Database, topic: "SQL Basics: SELECT, JOIN and GROUP BY", notes: "Use an e-commerce orders/customers schema. Include common mistakes with JOINs." },
  { icon: Bot, topic: "How Large Language Models Work", notes: "Non-technical audience. Explain tokens, training, prompts and limitations with everyday analogies." },
  { icon: TrendingUp, topic: "Statistics for Data Science: Mean, Median and Standard Deviation", notes: "Use cricket scores as the running example. Include when to use median over mean." },
  { icon: BarChart3, topic: "Power BI Dashboards for Business Reporting", notes: "Audience: working professionals. Cover data import, relationships, DAX basics and a KPI dashboard." },
  { icon: Brain, topic: "Machine Learning: Linear Regression Explained", notes: "Predict house prices. Cover the best-fit line, error and how the model learns, with an interactive slider." },
  { icon: Smartphone, topic: "Digital Payments in India: How UPI Works", notes: "Explain the UPI flow step by step, banks, NPCI, security and real-life examples." },
];

export default function Home() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [sessions, setSessions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/sessions").then(setSessions).catch((e) => setError(e.message));
  }, []);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const s = await api("/sessions", { topic, notes });
      router.push(`/session/${s.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <section className="hero">
        <h1>Create an AI classroom lesson</h1>
        <p>Give a topic and Sarvam AI builds the outline, interactive slides, a classroom discussion and voice narration.</p>
      </section>

      <form className="card form-card" onSubmit={create}>
        <h3>New lesson</h3>
        <p className="muted" style={{ marginBottom: 16 }}>You review and approve every step before students see it.</p>
        <label className="field" htmlFor="topic">Topic</label>
        <input id="topic" placeholder="e.g. Introduction to Operating Systems" value={topic} onChange={(e) => setTopic(e.target.value)} required />
        <div className="suggest">
          <span className="suggest-label"><Sparkles size={14} /> Try a suggestion</span>
          <div className="suggest-list">
            {SUGGESTIONS.map((sg) => (
              <button
                type="button"
                key={sg.topic}
                className={`suggest-chip${topic === sg.topic ? " active" : ""}`}
                onClick={() => {
                  setTopic(sg.topic);
                  setNotes(sg.notes);
                }}
              >
                <sg.icon size={15} /> {sg.topic}
              </button>
            ))}
          </div>
        </div>
        <label className="field" htmlFor="notes">Source notes <span className="muted">(optional)</span></label>
        <textarea id="notes" rows={4} placeholder="Paste syllabus points or notes the lesson should follow" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="btn-row">
          <button disabled={busy}>
            {busy && <span className="spinner" />}
            {busy ? "Generating outline..." : "Generate outline"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>

      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Your lessons</h3>
          <span className="badge">{sessions.length}</span>
        </div>
        {sessions.length === 0 ? (
          <p className="empty">No lessons yet. Create your first one above.</p>
        ) : (
          <div className="grid">
            {sessions.map((s) => (
              <div className="tile" key={s.id}>
                <div className="tile-top">
                  <h3 style={{ margin: 0 }}>{s.topic}</h3>
                  <span className={`badge ${s.stage === "done" ? "success" : "primary"}`}>{STAGE_NAMES[s.stage] || s.stage}</span>
                </div>
                {s.updatedAt && <div className="tile-meta">Updated {new Date(s.updatedAt).toLocaleString()}</div>}
                <div className="btn-row">
                  <a className="btn" href={`/session/${s.id}`}>{s.stage === "done" ? "View" : "Continue"}</a>
                  {s.stage === "done" && <a className="btn secondary" href={`/learn/${s.id}`}>Open as student</a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
