const http = require("http");
const fs = require("fs");
const path = require("path");
const availabilityHandler = require("./api/availability");
const liveSourcesHandler = require("./api/live-sources");

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function send(res, status, body, type) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), "application/json; charset=utf-8");
}

function createApiResponse(res) {
  return {
    setHeader: (key, value) => res.setHeader(key, value),
    status(statusCode) {
      res.statusCode = statusCode;
      return this;
    },
    json(payload) {
      sendJson(res, res.statusCode || 200, payload);
    },
  };
}

function safePath(urlPath) {
  const cleanPath = urlPath === "/" ? "/index.html" : urlPath;
  const normalized = path.normalize(cleanPath).replace(/^(\.\.[/\\])+/, "");
  return path.join(ROOT, normalized);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (url.pathname === "/api/live-sources") {
    req.query = Object.fromEntries(url.searchParams.entries());
    liveSourcesHandler(req, createApiResponse(res));
    return;
  }

  if (url.pathname === "/api/availability") {
    req.query = Object.fromEntries(url.searchParams.entries());
    availabilityHandler(req, createApiResponse(res));
    return;
  }

  const requested = safePath(url.pathname);

  if (!requested.startsWith(ROOT)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  fs.readFile(requested, (error, buffer) => {
    if (error) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }

    const ext = path.extname(requested);
    send(res, 200, buffer, MIME_TYPES[ext] || "application/octet-stream");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Tennisplatz-Finder laeuft auf http://${HOST}:${PORT}`);
});
