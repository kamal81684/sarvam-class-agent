// Sarvam Document AI (Sarvam Vision): digitise an uploaded image into text
const BASE = "https://api.sarvam.ai/doc-ai/v1/job";
const DONE = ["completed", "partially_completed", "failed", "rejected"];

export async function readImage(buffer, filename, mime) {
  const headers = { "api-subscription-key": process.env.SARVAM_API_KEY };
  const fd = new FormData();
  fd.append("file", new Blob([buffer], { type: mime }), filename);
  fd.append("language", "en-IN");
  fd.append("output_format", "md");

  const created = await fetch(`${BASE}/digitise`, { method: "POST", headers, body: fd });
  if (!created.ok) throw new Error(`Sarvam Doc AI ${created.status}: ${await created.text()}`);
  const { job_id } = await created.json();

  let status;
  for (let i = 0; i < 60; i++) {
    status = (await (await fetch(`${BASE}/${job_id}/status`, { headers })).json()).status;
    if (DONE.includes(status)) break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (!["completed", "partially_completed"].includes(status)) throw new Error(`Image reading ${status || "timed out"}`);

  const results = await (await fetch(`${BASE}/${job_id}/results`, { headers })).json();
  return results.documents
    .flatMap((d) => d.pages)
    .flatMap((p) => p.blocks)
    .sort((a, b) => a.reading_order - b.reading_order)
    .map((b) => b.text)
    .join("\n");
}
