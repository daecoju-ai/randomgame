const CACHE='fortune-forge-v11-1';
const SHELL=['/','/index.html','/styles.css','/game.js','/pwa.js','/manifest.webmanifest','/assets/heroes-v10.webp','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
// Activate a new version after all old game tabs close, preventing mixed game assets mid-battle.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fortune-forge-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;if(!SHELL.includes(url.pathname))return;event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||fetch(event.request)))});
