"use client";
import { Play, Pause, ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { API } from "@/lib/api";
import SlideFrame from "@/components/SlideFrame";
import "@/app/teacher.css";

export default function Player({ slides, onSlideChange }) {
  const [slide, setSlide] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audio = useRef(null);
  const frame = useRef(null);
  const clips = useRef(new Map()); // narration text -> Promise<blob URL>

  const current = slides[slide];

  useEffect(() => {
    onSlideChange?.(current?.id);
  }, [slide]);
  const action = current?.actions?.[step];
  const steps = current?.actions?.length || 0;

  // Fetch a narration clip once; every caller shares the same request.
  function clip(text) {
    if (!clips.current.has(text)) {
      const p = fetch(`${API}/api/tts?text=${encodeURIComponent(text)}`)
        .then((r) => {
          if (!r.ok) throw new Error(`TTS failed (${r.status})`);
          return r.blob();
        })
        .then((b) => URL.createObjectURL(b));
      p.catch(() => clips.current.delete(text)); // allow a retry later
      clips.current.set(text, p);
    }
    return clips.current.get(text);
  }

  // Prefetch every step of this slide and the next one in parallel, so each
  // step starts instantly instead of waiting ~2s for its audio.
  useEffect(() => {
    [slides[slide], slides[slide + 1]]
      .flatMap((sl) => sl?.actions || [])
      .forEach((a) => a.narration && clip(a.narration).catch(() => {}));
  }, [slide]);

  // Highlight the target and play narration for the current step.
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ target: action?.target }, "*");
    if (!playing || !action) return;
    let cancelled = false;
    clip(action.narration)
      .then((url) => {
        if (cancelled) return;
        audio.current.src = url;
        return audio.current.play();
      })
      .catch(() => !cancelled && setPlaying(false));
    return () => {
      cancelled = true;
    };
  }, [slide, step, playing]);

  // Pausing stops the current clip.
  useEffect(() => {
    if (!playing) audio.current?.pause();
  }, [playing]);

  function next() {
    if (step + 1 < (current.actions?.length || 0)) return setStep(step + 1);
    if (slide + 1 < slides.length) {
      setSlide(slide + 1);
      setStep(0);
    } else setPlaying(false);
  }

  function goTo(k) {
    setSlide(k);
    setStep(0);
  }

  const pct = steps ? ((step + 1) / steps) * 100 : 0;

  return (
    <div className="card">
      <div className="pills">
        {slides.map((sl, k) => (
          <button key={sl.id} className={`pill ${k === slide ? "active" : ""}`} onClick={() => goTo(k)}>
            <span className="num">{k + 1}.</span> {sl.title} {sl.regenerated ? <Sparkles size={13} className="regen-icon" /> : null}
          </button>
        ))}
      </div>
      <div className="player-stage">
        <SlideFrame
          html={current.html}
          frameRef={frame}
          onLoad={() => frame.current?.contentWindow?.postMessage({ target: action?.target }, "*")}
        />
        <div className={`caption ${action?.narration ? "" : "empty-cap"}`}>{action?.narration || "Press play to start the lesson."}</div>
      </div>
      <div className="controls">
        <button className="play-btn" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
        </button>
        <div className="progress-wrap">
          <div className="progress-text">
            <span>Slide {slide + 1} of {slides.length}</span>
            <span>Step {steps ? step + 1 : 0} / {steps}</span>
          </div>
          <div className="progress"><div style={{ width: `${pct}%` }} /></div>
        </div>
        <button className="secondary" onClick={next}>Next step <ArrowRight size={16} /></button>
      </div>
      <audio ref={audio} onEnded={next} />
    </div>
  );
}
