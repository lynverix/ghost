// load the scramjet worker bundle
importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

self.addEventListener("fetch", (event) => {
  event.respondWith((async () => {
    // load scramjet config before routing
    await scramjet.loadConfig();

    if (scramjet.route(event)) {
      return scramjet.fetch(event);
    }

    // not a proxied request, pass it through normally
    return fetch(event.request);
  })());
});