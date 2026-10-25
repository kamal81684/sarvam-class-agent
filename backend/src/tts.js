// Sarvam bulbul TTS -> mp3 bytes
export async function tts(text) {
  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-subscription-key": process.env.SARVAM_API_KEY },
    body: JSON.stringify({
      text: text.slice(0, 2500),
      model: process.env.TTS_MODEL || "bulbul:v3",
      speaker: process.env.TTS_VOICE || "ritu",
      target_language_code: process.env.TTS_LANGUAGE || "en-IN",
      output_audio_codec: "mp3",
      pace: Number(process.env.TTS_PACE || 0.9),
    }),
  });
  if (!res.ok) throw new Error(`Sarvam TTS ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return Buffer.from(data.audios[0], "base64");
}
