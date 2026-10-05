// Local preview of dist/ with the same routing as production (/app/* falls back to the web app).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const dist = new URL("./dist", import.meta.url).pathname;
const port = Number(process.env.PORT ?? 5180);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".ico": "image/x-icon", ".ttf": "font/ttf", ".woff2": "font/woff2" };

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(dist, path);
  try { if ((await stat(file)).isDirectory()) file = join(file, "index.html"); }
  catch { file = path.startsWith("/app") ? join(dist, "app/index.html") : join(dist, "index.html"); }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch { res.writeHead(404).end("Not found"); }
}).listen(port, () => console.log(`PvtFrnd website on http://localhost:${port}`));
