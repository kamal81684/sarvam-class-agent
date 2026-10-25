"use client";
import { Mic, Square, ImagePlus, X, Camera, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { API, api } from "@/lib/api";

const MAX_SECONDS = 28; // Sarvam STT REST accepts up to 30s

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function pickMime() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) || "";
}

export default function AskDoubt({ sessionId, slideId, slideTitle, slides = [], initialDoubts = [] }) {
  const [question, setQuestion] = useState("");
  const [language, setLanguage] = useState("");
  const [image, setImage] = useState(null); // {file, preview}
  const [doubts, setDoubts] = useState(initialDoubts);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef(null);
  const timer = useRef(null);
  const audio = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMime();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timer.current);
        setRecording(false);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (!blob.size) return;
        setBusy("Transcribing your voice…");
        try {
          const res = await api("/stt", { audio: await toBase64(blob), mime: blob.type.split(";")[0] });
          setQuestion((q) => (q ? q + " " : "") + (res.transcript || ""));
          setLanguage(res.language || "");
        } catch (e) {
          setError(e.message);
        }
        setBusy("");
      };
      recorder.current = rec;
      rec.start();
      setSeconds(0);
      setRecording(true);
      timer.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      setError("Microphone not available: " + e.message);
    }
  }

  function stopRecording() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function pickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage({ file, preview: URL.createObjectURL(file) });
    e.target.value = "";
  }

  function play(d) {
    if (!audio.current) return;
    audio.current.src = `${API}/api/tts?text=${encodeURIComponent(d.answer)}&lang=${encodeURIComponent(d.language || "en-IN")}`;
    audio.current.play().catch(() => {});
  }

  async function ask() {
    setError("");
    setBusy(image ? "Reading your image…" : "Thinking…");
    try {
      const body = { question, slideId, language: language || "en-IN" };
      if (image) body.image = { data: await toBase64(image.file), name: image.file.name, mime: image.file.type };
      const s = await api(`/sessions/${sessionId}/doubts`, body);
      const all = s.doubts || [];
      setDoubts(all);
      setQuestion("");
      setLanguage("");
      setImage(null);
      if (all.length) play(all[all.length - 1]);
    } catch (e) {
      setError(e.message);
    }
    setBusy("");
  }

  const titleOf = (id) => slides.find((x) => x.id === id)?.title || id;
  const mm = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="card">
      <div className="card-header" style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Ask a doubt</h3>
        {slideTitle && <span className="badge yellow">On: {slideTitle}</span>}
      </div>
      <p className="muted">Type, speak (any Indian language) or upload a photo of your question.</p>

      <textarea
        rows={3}
        placeholder="Type your doubt here…"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        disabled={recording}
      />

      <div className="doubt-tools">
        {recording ? (
          <>
            <span className="rec"><span className="rec-dot" /> Recording… {mm}</span>
            <button className="danger" onClick={stopRecording}><Square size={14} fill="currentColor" /> Stop</button>
          </>
        ) : (
          <button className="secondary" onClick={startRecording} disabled={!!busy}><Mic size={16} /> Speak</button>
        )}
        <button className="secondary" onClick={() => fileInput.current?.click()} disabled={!!busy || recording}><ImagePlus size={16} /> Photo</button>
        <input ref={fileInput} type="file" accept="image/png,image/jpeg" hidden onChange={pickImage} />
        {language && <span className="badge primary">{language}</span>}
      </div>

      {image && (
        <div className="thumb">
          <img src={image.preview} alt="Doubt attachment" />
          <button onClick={() => setImage(null)} aria-label="Remove image"><X size={14} /></button>
        </div>
      )}

      {busy && <p className="loading"><span className="spinner" /> {busy}</p>}
      {error && <p className="error">{error}</p>}

      <button onClick={ask} disabled={!!busy || recording || (!question.trim() && !image)} style={{ width: "100%" }}>
        Ask
      </button>

      {doubts.length > 0 && (
        <div className="thread">
          {[...doubts].reverse().map((d, i) => (
            <div className="qa" key={d.at || i}>
              <div className="bubble q">
                <div className="bubble-who">You {d.hasImage ? <Camera size={13} /> : null}</div>
                {d.question}
              </div>
              {d.hasImage && d.imageText && (
                <details>
                  <summary>Text read from image</summary>
                  <pre>{d.imageText}</pre>
                </details>
              )}
              <div className="bubble a">
                <div className="bubble-who">Dr. Smith</div>
                {d.answer}
                <div>
                  <button className="ghost" onClick={() => play(d)}><Volume2 size={16} /> Listen</button>
                </div>
              </div>
              <span className="qa-meta">
                Slide: {titleOf(d.slideId)} · {d.language}
              </span>
            </div>
          ))}
        </div>
      )}
      <audio ref={audio} />
    </div>
  );
}
