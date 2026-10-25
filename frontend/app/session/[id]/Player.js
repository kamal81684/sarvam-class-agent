"use client";
import { useEffect, useRef, useState } from "react";
import { API } from "@/lib/api";

// Injected into each slide so the player can highlight data-ax elements.
const HIGHLIGHT_SCRIPT = `<script>
window.addEventListener("message", function (e) {
  document.querySelectorAll("[data-ax]").forEach(function (el) { el.style.outline = ""; el.style.boxShadow = ""; });
  if (!e.data || !e.data.target) return;
  var el = document.querySelector('[data-ax="' + e.data.target + '"]');
  if (el) { el.style.outline = "3px solid #facc15"; el.style.boxShadow = "0 0 24px #facc15"; el.scrollIntoView({ block: "nearest" }); }
});
</script>`;

export default function Player({ slides }) {
  const [slide, setSlide] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audio = useRef(null);
  const frame = useRef(null);

  const current = slides[slide];
  const action = current?.actions?.[step];

  // Highlight the target and play narration for the current step.
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ target: action?.target }, "*");
    if (!playing || !action) return;
    audio.current.src = `${API}/api/tts?text=${encodeURIComponent(action.narration)}`;
    audio.current.play().catch(() => setPlaying(false));
  }, [slide, step, playing]);

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

  return (
    <div className="card">
      <div className="tabs">
        {slides.map((sl, k) => (
          <button key={sl.id} className={k === slide ? "" : "secondary"} onClick={() => goTo(k)}>
            {k + 1}. {sl.title} {sl.regenerated ? "✨" : ""}
          </button>
        ))}
      </div>
      <iframe
        ref={frame}
        className="slide"
        sandbox="allow-scripts"
        srcDoc={current.html + HIGHLIGHT_SCRIPT}
        onLoad={() => frame.current?.contentWindow?.postMessage({ target: action?.target }, "*")}
      />
      <p className="narration">{action?.narration}</p>
      <div className="row">
        <button onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "▶ Play lesson"}</button>
        <button className="secondary" onClick={next}>Next step</button>
        <span className="muted">
          Slide {slide + 1}/{slides.length} · Step {step + 1}/{current.actions?.length || 0}
        </span>
      </div>
      <audio ref={audio} onEnded={next} />
    </div>
  );
}
