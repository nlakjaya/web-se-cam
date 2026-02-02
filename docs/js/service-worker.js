const sw = self; // as ServiceWorkerGlobalScope;

const CACHE_KEY = "websecam-v0.1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/script.js",
  "/icon/192.png",
  "/icon/512.png",
];

const logger = {
  debug: (
    ...messages //:any[]
  ) => console.log("DEBUG [service worker]", ...messages),
};

sw.addEventListener("install", (event) => {
  logger.debug("Installing...");
  event.waitUntil(
    caches.open(CACHE_KEY).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  sw.skipWaiting();
});

sw.addEventListener("activate", (event) => {
  logger.debug("Activating...");
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_KEY)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  sw.clients.claim();
});

sw.addEventListener("fetch", (event) => {
  debugger; // TODO: test network interception
  if (event.request.method !== "GET") return;
  logger.debug("Intercepting fetch:", event.request.url);
  async function cachedFetch() {
    let cached = await caches.match(event.request);
    if (cached) {
      logger.debug("Cache hit:", event.request.url);
      return cached;
    }
    logger.debug("Cache miss:", event.request.url);
    const response = await fetch(event.request);
    if (response.ok) {
      caches
        .open(CACHE_KEY)
        .then((cache) => cache.put(event.request, response.clone()));
    }
    return response;
  }

  event.respondWith(cachedFetch());
});

sw.addEventListener("updatefound", () => {
  logger.debug("New version found");
});
