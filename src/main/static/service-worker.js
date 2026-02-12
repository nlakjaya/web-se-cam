const sw = self; // as ServiceWorkerGlobalScope;

const CACHE_KEY = "websecam-v0.1";
const STATIC_ASSETS = [
  "",
  "index.html",
  "icon/192.png",
  "icon/512.png",
  "css/style.css",
  "js/script.js",
  "css/bootstrap.css",
  "js/klesun/ts-browser/src/actions/ParseTsModule_sideEffects.js",
  "js/klesun/ts-browser/src/sideEffectModules/sideEffectUtils.js",
  "js/klesun/ts-browser/src/TranspileWorker.js",
  "js/klesun/ts-browser/src/ts-browser.js",
  "js/klesun/ts-browser/src/UrlPathResolver_sideEffects.js",
  "js/klesun/ts-browser/src/UrlPathResolver.js",
  "js/klesun/ts-browser/src/utils.js",
  "js/klesun/ts-browser/src/WorkerManager.js",
  "js/typescriptservices-min-js-builds/v5.4.5/typescript.js"
];

const logger = {
  debug: (
    ...messages //:any[]
  ) => console.log("DEBUG [service worker]", ...messages),
};

async function cacheFirst(event) {
  const cached = await caches.match(event.request);
  if (cached) {
    logger.debug("cache hit:", event.request.url);
    return cached;
  }

  logger.debug("cache miss:", event.request.url);
  try {
    const response = await fetch(event.request);
    if (response.ok) {
      const responseClone = response.clone();
      event.waitUntil(
        caches
          .open(CACHE_KEY)
          .then((cache) => cache.put(event.request, responseClone)),
      );
    }
    return response;
  } catch (err) {
    logger.debug("fetch error:", err);
    return new Response("", { status: 503 });
  }
}

sw.addEventListener("install", (event) => {
  logger.debug("installing...");
  event.waitUntil(
    caches
      .open(CACHE_KEY)
      .then((cache) =>
        cache.addAll(
          STATIC_ASSETS.map(
            (path) => new URL(path, sw.registration.scope).href,
          ),
        ),
      ),
  );
  sw.skipWaiting();
});

sw.addEventListener("activate", (event) => {
  logger.debug("activating...");
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
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;
  logger.debug("Intercepting fetch:", event.request.url);
  event.respondWith(cacheFirst(event));
});

sw.addEventListener("updatefound", () => {
  logger.debug("new version found");
});
