export const API = (process.env.API_URL || "http://localhost:8095").replace(/\/$/, "");

export async function api(path, body) {
  const res = await fetch(`${API}/api${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
