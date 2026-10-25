"use client";
import { ArrowLeft, Check, ListOrdered, MessageCircleQuestion, PlayCircle, Sparkles, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Player from "@/components/Player";
import AskDoubt from "@/components/AskDoubt";
import "../learn.css";

export default function LearnLesson({ params }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState("");
  const [slideId, setSlideId] = useState(null);
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState("slides");
  const [others, setOthers] = useState([]);

  useEffect(() => {
    api(`/sessions/${params.id}`).then(setS).catch((e) => setError(e.message));
    api("/sessions")
      .then((all) => setOthers(all.filter((l) => l.hasSlides && l.id !== params.id)))
      .catch(() => {});
  }, [params.id]);

  if (error) return <p className="error">{error}</p>;
  if (!s) return <p className="loading"><span className="spinner" /> Loading lesson…</p>;

  if (!s.slides?.length) {
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
        <div className="btn-row">
          {s.stage !== "done" && <span className="badge yellow">Preview · narration not added yet</span>}
          <span className="badge primary">{s.slides.length} slides</span>
        </div>
      </div>
      <div className="learn-layout">
        <div>
          <Player
            slides={s.slides}
            index={active}
            showPills={false}
            onSlideChange={(id, k) => {
              setSlideId(id);
              setActive(k);
            }}
          />
        </div>
        <aside className="learn-side">
          <div className="side-tabs" role="tablist">
            <button role="tab" aria-selected={tab === "slides"} className={tab === "slides" ? "on" : ""} onClick={() => setTab("slides")}>
              <ListOrdered size={16} /> Slides <span className="count">{s.slides.length}</span>
            </button>
            <button role="tab" aria-selected={tab === "doubt"} className={tab === "doubt" ? "on" : ""} onClick={() => setTab("doubt")}>
              <MessageCircleQuestion size={16} /> Ask doubt {s.doubts?.length ? <span className="count">{s.doubts.length}</span> : null}
            </button>
          </div>

          {tab === "slides" && (
            <div className="card side-card">
              <ol className="slide-list">
                {s.slides.map((sl, k) => {
                  const state = k === active ? "now" : k < active ? "done" : "";
                  return (
                    <li key={sl.id}>
                      <button className={`slide-item ${state}`} onClick={() => setActive(k)}>
                        <span className="slide-num">{k < active ? <Check size={14} strokeWidth={3} /> : k + 1}</span>
                        <span className="slide-text">
                          <span className="slide-name">
                            {sl.title} {sl.regenerated ? <Sparkles size={13} className="regen-icon" /> : null}
                          </span>
                          <span className="slide-sub">
                            {k === active ? (
                              <><PlayCircle size={12} /> Now playing</>
                            ) : (
                              `${sl.actions?.length || 0} narration steps`
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <button className="secondary ask-cta" onClick={() => setTab("doubt")}>
                <MessageCircleQuestion size={16} /> Doubt on this slide? Ask now
              </button>
              {others.length > 0 && (
                <div className="other-lessons">
                  <span className="side-label"><BookOpen size={14} /> Other lessons</span>
                  {others.map((l) => (
                    <a key={l.id} href={`/learn/${l.id}`} className="other-lesson">
                      <span>{l.topic}</span>
                      <span className={`badge ${l.stage === "done" ? "success" : "yellow"}`}>{l.stage === "done" ? "Ready" : "Preview"}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "doubt" && (
            <AskDoubt sessionId={s.id} slideId={slide?.id} slideTitle={slide?.title} slides={s.slides} initialDoubts={s.doubts || []} />
          )}
        </aside>
      </div>
    </>
  );
}
