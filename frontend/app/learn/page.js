"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import "./learn.css";

export default function LearnHome() {
  const [lessons, setLessons] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/sessions")
      .then((all) => setLessons(all.filter((s) => s.stage === "done")))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <section className="hero">
        <h1>Your lessons</h1>
        <p>Watch narrated lessons and ask doubts anytime: type, speak in any Indian language, or upload a photo of your question.</p>
      </section>

      {error && <p className="error">{error}</p>}
      {!lessons && !error && (
        <p className="loading"><span className="spinner" /> Loading lessons…</p>
      )}
      {lessons?.length === 0 && (
        <div className="card">
          <h3>No lessons yet</h3>
          <p className="muted">Your teacher hasn't published any lessons. Check back soon.</p>
        </div>
      )}
      {lessons?.length > 0 && (
        <div className="grid">
          {lessons.map((l) => (
            <a key={l.id} href={`/learn/${l.id}`} className="tile">
              <h3>{l.topic}</h3>
              <div className="tile-meta">
                <span className="badge success">Ready</span>
                <span className="muted">{l.updatedAt ? new Date(l.updatedAt).toLocaleDateString() : ""}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
