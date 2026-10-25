// Sarvam saaras speech-to-text (REST, audio up to 30s)
export async function stt(buffer, mime = "audio/webm") {
  const fd = new FormData();
  fd.append("file", new Blob([buffer], { type: mime }), `doubt.${mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "mp4" : "webm"}`);
  fd.append("model", process.env.STT_MODEL || "saaras:v3");
  fd.append("mode", "transcribe");
  const res = await fetch("https://api.sarvam.ai/speech-to-text", {
    method: "POST",
    headers: { "api-subscription-key": process.env.SARVAM_API_KEY },
    body: fd,
  });
  if (!res.ok) throw new Error(`Sarvam STT ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { transcript: data.transcript, language: data.language_code || "en-IN" };
}
