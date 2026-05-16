importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(clients.claim());
});

async function handleRequest(event) {
  const url = event.request.url;
  const dest = event.request.destination;
  const mode = event.request.mode;

  await scramjet.loadConfig();
  const routes = scramjet.route(event);

  console.log("[sw]", mode, dest, "| routes:", routes, "|", url);

  if (routes) {
    try {
      return await scramjet.fetch(event);
    } catch (err) {
      console.error("[sw] fetch error:", err.message);
      return new Response("proxy error: " + err.message, { status: 500 });
    }
  }
  return fetch(event.request);
}

self.addEventListener("fetch", e => {
  e.respondWith(handleRequest(e));
});