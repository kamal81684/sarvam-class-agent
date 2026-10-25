"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

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
      <form className="card" onSubmit={create}>
        <h2>New lesson</h2>
        <input placeholder="Topic, e.g. Introduction to Operating Systems" value={topic} onChange={(e) => setTopic(e.target.value)} required />
        <textarea rows={4} placeholder="Optional source notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button disabled={busy}>{busy ? "Generating outline..." : "Generate outline"}</button>
        {error && <p className="error">{error}</p>}
      </form>

      <div className="card">
        <h2>Lessons</h2>
        {sessions.length === 0 && <p className="muted">No lessons yet.</p>}
        <ul className="list">
          {sessions.map((s) => (
            <li key={s.id}>
              <a href={`/session/${s.id}`}>{s.topic}</a> <span className="badge">{s.stage}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
