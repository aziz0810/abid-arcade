/* Matchday Arcade service worker: makes the site installable and lets the
   same-device games open offline. Same-origin files are served from cache and
   refreshed in the background; online play (Firebase) always uses the network. */
const CACHE = "matchday-v3";
const SHELL = ["./", "index.html", "online.js", "online.css", "i18n.js", "firebase-config.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});

/* Push messages (sent by the Cloud Functions in /functions through Firebase Cloud Messaging) */
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { notification: { body: e.data && e.data.text() } }; }
  const n = d.notification || {}, data = d.data || {};
  const url = data.url || (d.fcmOptions && d.fcmOptions.link) || "./";
  e.waitUntil(self.registration.showNotification(n.title || data.title || "Matchday Arcade", {
    body: n.body || data.body || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png",
    tag: data.tag || undefined, data: { url }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    for (const w of ws) if (w.url.startsWith(self.registration.scope) && "focus" in w) { w.navigate(url).catch(() => {}); return w.focus(); }
    return clients.openWindow(url);
  }));
});
