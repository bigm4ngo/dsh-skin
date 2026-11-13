// src/index.ts
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { Readable } from "node:stream";
var name = "dsh-skin";
var inject = ["webServer"];
var reusable = true;
var ROUTE = "/dsh-skin";
var TYPES = {
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf"
};
var manifests = /* @__PURE__ */ new Map();
var IMAGE = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
var VIDEO = [".mp4", ".webm"];
var AUDIO = [".mp3", ".ogg", ".wav"];
var FONT = [".woff2", ".woff", ".ttf"];
var LOGO = [".svg", ".png", ".webp"];
var LIMITS = {
  image: 20 * 1024 * 1024,
  video: 512 * 1024 * 1024,
  audio: 128 * 1024 * 1024,
  logo: 512 * 1024
};
var COLOUR = /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|transparent$|color-mix\()/i;
async function checkFile(dir, rel, allowed, limitKey) {
  const ext = extname(rel).toLowerCase();
  if (!allowed.includes(ext)) return `"${rel}" is not a supported file (${allowed.join(", ")})`;
  try {
    const info = await stat(resolve(dir, rel));
    if (!info.isFile()) return `"${rel}" not found`;
    const limit = LIMITS[limitKey] ?? 0;
    if (limit > 0 && info.size > limit) {
      return `"${rel}" is ${Math.round(info.size / 1024 / 1024)} MB; the limit is ${Math.round(limit / 1024 / 1024)} MB`;
    }
    return null;
  } catch {
    return `"${rel}" not found`;
  }
}
async function validate(dir, manifest) {
  const warnings = [];
  if (typeof manifest.name !== "string" || manifest.name.trim() === "") {
    return { error: "skin.json has no name", warnings };
  }
  const bg = manifest.background ?? {};
  if (typeof bg.file === "string" && bg.file !== "") {
    const isVideo = VIDEO.includes(extname(bg.file).toLowerCase());
    const problem = await checkFile(dir, bg.file, [...IMAGE, ...VIDEO], isVideo ? "video" : "image");
    if (problem !== null) return { error: problem, warnings };
  }
  const audio = manifest.audio ?? {};
  if (typeof audio.file === "string" && audio.file !== "" && audio.file !== "@video") {
    const problem = await checkFile(dir, audio.file, AUDIO, "audio");
    if (problem !== null) return { error: problem, warnings };
  }
  const branding = manifest.branding ?? {};
  if (typeof branding.mark === "string" && branding.mark !== "") {
    const problem = await checkFile(dir, branding.mark, LOGO, "logo");
    if (problem !== null) return { error: problem, warnings };
    if (extname(branding.mark).toLowerCase() === ".svg") {
      try {
        const svg = await readFile(resolve(dir, branding.mark), "utf8");
        if (/<script|on[a-z]+\s*=/i.test(svg)) warnings.push(`${branding.mark} contained script and was sanitised`);
      } catch {
        warnings.push(`${branding.mark} could not be read`);
      }
    }
  }
  if (typeof branding.deepDivingMark === "string" && branding.deepDivingMark !== "") {
    const problem = await checkFile(dir, branding.deepDivingMark, LOGO, "logo");
    if (problem !== null) return { error: problem, warnings };
  }
  if (branding.deepDivingText !== void 0) {
    if (typeof branding.deepDivingText !== "string") {
      return { error: "branding.deepDivingText must be text", warnings };
    }
    if (branding.deepDivingText.length > 120) {
      return { error: "branding.deepDivingText is longer than 120 characters", warnings };
    }
  }
  const ui = manifest.ui ?? {};
  if (typeof ui.font === "string" && FONT.includes(extname(ui.font).toLowerCase())) {
    warnings.push(`font "${ui.font}" needs a licence file next to it`);
  }
  const colours = manifest.colors ?? {};
  for (const mode of ["dark", "light"]) {
    const table = colours[mode];
    if (table === void 0 || table === null) continue;
    for (const [token, value] of Object.entries(table)) {
      if (typeof value !== "string" || !COLOUR.test(value.trim())) {
        return { error: `colors.${mode}["${token}"] = "${String(value)}" is not a colour`, warnings };
      }
    }
  }
  return { error: null, warnings };
}
function skinsRoot() {
  return process.env.DSH_SKINS_DIR ?? join(homedir(), ".config", "dsh", "skins");
}
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
function validSegment(name2) {
  return /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(name2) && !name2.includes("..");
}
function validPath(id) {
  const parts = id.split("/");
  return parts.length >= 1 && parts.length <= 2 && parts.every(validSegment);
}
async function readSkin(root, id, group) {
  if (!validPath(id)) return null;
  const dir = join(root, id);
  try {
    const info = await stat(dir);
    if (!info.isDirectory()) return null;
    const raw = await readFile(join(dir, "skin.json"), "utf8");
    const manifest = JSON.parse(raw);
    if (typeof manifest.name !== "string" || manifest.name.trim() === "") {
      return { id, group, manifest, error: "skin.json has no name", warnings: [] };
    }
    const { error, warnings } = await validate(dir, manifest);
    manifests.set(id, manifest);
    return { id, group, manifest, error, warnings };
  } catch {
    return null;
  }
}
async function listSkins() {
  const root = skinsRoot();
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const skins = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || !validSegment(entry.name)) continue;
    const top = await readSkin(root, entry.name, null);
    if (top !== null) {
      skins.push(top);
      continue;
    }
    let children;
    try {
      children = await readdir(join(root, entry.name), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!child.isDirectory() || !validSegment(child.name)) continue;
      const skin = await readSkin(root, `${entry.name}/${child.name}`, entry.name);
      if (skin !== null) skins.push(skin);
    }
  }
  return skins;
}
async function serveFile(id, relPath, request) {
  if (!validPath(id)) return new Response("bad skin id", { status: 400 });
  const root = resolve(skinsRoot());
  const target = resolve(root, id, relPath);
  if (!target.startsWith(root + sep)) return new Response("outside skins dir", { status: 403 });
  const type = TYPES[extname(target).toLowerCase()];
  if (type === void 0) return new Response("unsupported file type", { status: 415 });
  try {
    const info = await stat(target);
    if (!info.isFile()) return new Response("not a file", { status: 404 });
    const base = {
      "content-type": type,
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff",
      "accept-ranges": "bytes"
    };
    const range = request.headers.get("range");
    if (range !== null) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (match !== null) {
        const size = info.size;
        const start = match[1] === "" ? size - Number(match[2]) : Number(match[1]);
        const end = match[1] === "" || match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
        if (start < 0 || start > end || start >= size) {
          return new Response("range not satisfiable", {
            status: 416,
            headers: { "content-range": `bytes */${size}` }
          });
        }
        const body2 = Readable.toWeb(createReadStream(target, { start, end }));
        return new Response(body2, {
          status: 206,
          headers: {
            ...base,
            "content-length": String(end - start + 1),
            "content-range": `bytes ${start}-${end}/${size}`
          }
        });
      }
    }
    if (request.method === "HEAD") {
      return new Response(null, { headers: { ...base, "content-length": String(info.size) } });
    }
    const body = Readable.toWeb(createReadStream(target));
    return new Response(body, {
      headers: { ...base, "content-length": String(info.size) }
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
function openSkinsFolder() {
  const dir = skinsRoot();
  const override = process.env.DSH_SKIN_OPEN_COMMAND;
  const command = override !== void 0 && override.trim() !== "" ? override.trim() : process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
  const child = spawn(command, [dir], { detached: true, stdio: "ignore" });
  child.on("error", () => {
  });
  child.unref();
}
async function splitSkinRequest(root, segments) {
  for (const prefix of [2, 1]) {
    if (segments.length <= prefix) continue;
    const id = segments.slice(0, prefix).join("/");
    if (!validPath(id)) continue;
    try {
      const info = await stat(join(root, id, "skin.json"));
      if (!info.isFile()) continue;
      return { id, file: segments.slice(prefix).join("/") };
    } catch {
    }
  }
  return null;
}
async function handle(request) {
  const url = new URL(request.url);
  const rest = url.pathname.slice(ROUTE.length).replace(/^\/+/, "");
  if (rest === "open-folder") {
    if (request.method !== "GET") return new Response("method not allowed", { status: 405 });
    try {
      openSkinsFolder();
      return json({ opened: true, path: skinsRoot() });
    } catch (error) {
      return json({ opened: false, error: error instanceof Error ? error.message : String(error) }, 500);
    }
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("method not allowed", { status: 405 });
  }
  if (rest === "" || rest === "index.json") return json(await listSkins());
  let segments;
  try {
    segments = rest.split("/").map((segment) => decodeURIComponent(segment));
  } catch {
    return new Response("bad path encoding", { status: 400 });
  }
  const root = resolve(skinsRoot());
  const resolved = await splitSkinRequest(root, segments);
  if (resolved === null) return new Response("not found", { status: 404 });
  return serveFile(resolved.id, resolved.file, request);
}
function apply(ctx) {
  ctx.inject(["webServer"], (web) => {
    ctx.effect(
      () => web.webServer.register({
        kind: "prefix",
        path: ROUTE,
        resource: (request) => handle(request)
      }),
      "dsh-skin: skins route"
    );
  });
}
export {
  apply,
  inject,
  name,
  reusable
};
