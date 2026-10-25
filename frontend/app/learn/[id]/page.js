"use client";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Player from "@/components/Player";
import AskDoubt from "@/components/AskDoubt";
import "../learn.css";

export default function LearnLesson({ params }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState("");
  const [slideId, setSlideId] = useState(null);

  useEffect(() => {
    api(`/sessions/${params.id}`).then(setS).catch((e) => setError(e.message));
  }, [params.id]);

  if (error) return <p className="error">{error}</p>;
  if (!s) return <p className="loading"><span className="spinner" /> Loading lesson…</p>;

  if (s.stage !== "done") {
    return (
      <div className="card">
        <h2>{s.topic}</h2>
        <p className="muted">This lesson isn't ready yet. Your teacher is still preparing it. Please check back later.</p>
        <a href="/learn" className="btn secondary">Back to lessons</a>
      </div>
    );
  }

  const slide = s.slides.find((x) => x.id === slideId) || s.slides[0];

  return (
    <>
      <div className="card-header">
        <div>
          <a href="/learn" className="muted"><ArrowLeft size={15} /> All lessons</a>
          <h2 style={{ marginTop: 6 }}>{s.topic}</h2>
        </div>
        <span className="badge primary">{s.slides.length} slides</span>
      </div>
      <div className="learn-layout">
        <div>
          <Player slides={s.slides} onSlideChange={setSlideId} />
        </div>
        <div className="learn-side">
          <AskDoubt sessionId={s.id} slideId={slide?.id} slideTitle={slide?.title} slides={s.slides} initialDoubts={s.doubts || []} />
        </div>
      </div>
    </>
  );
}
