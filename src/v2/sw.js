/* V2 · service worker, giữ cách làm đã sửa ở GĐ8 (network-first cho HTML). Phạm vi chỉ trong src/v2/.
   Service worker cho PWA: mở được web khi mạng chập chờn.
   - Trang chính: lấy bản mới trên mạng trước (bỏ qua cả bộ nhớ đệm của trình duyệt, vì GitHub Pages cho giữ file 10 phút), mất mạng thì dùng bản đã lưu.
   - CSS, JS, ảnh (có ?v= theo phiên bản): dùng bản đã lưu, chưa có thì tải rồi lưu.
   - Dữ liệu Google Sheet (Apps Script) không đi qua đây: luôn gọi thẳng mạng.
   Đổi VERSION mỗi lần đưa bản mới lên để xóa bộ nhớ cũ. */
var VERSION = 'lpv2-v2x';
var CORE = ['./', 'index.html', 'manifest.json', 'img/hom-nay.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !fonts) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req, { cache: 'no-store' }).then(function (res) {
      var copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put('index.html', copy); });
      return res;
    }).catch(function () {
      return caches.match('index.html').then(function (r) { return r || caches.match('./'); });
    }));
    return;
  }

  e.respondWith(caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res.ok || res.type === 'opaque') {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
      }
      return res;
    });
  }));
});
