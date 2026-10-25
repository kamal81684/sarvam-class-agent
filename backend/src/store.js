import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DIR = path.resolve("sessions");
fs.mkdirSync(DIR, { recursive: true });

export function newId() {
  return crypto.randomUUID().slice(0, 8);
}

export function save(session) {
  session.updatedAt = new Date().toISOString();
  fs.writeFileSync(path.join(DIR, `${session.id}.json`), JSON.stringify(session, null, 2));
  return session;
}

export function load(id) {
  const file = path.join(DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function list() {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")))
    .map(({ id, topic, stage, updatedAt }) => ({ id, topic, stage, updatedAt }))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}
