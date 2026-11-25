/* V2 · thông báo nhắc việc. Dùng Notification API của trình duyệt khi được phép, không được thì hiện toast trong web.
     LP.notify.supported()            có hỗ trợ không
     LP.notify.permission()           'granted' | 'denied' | 'default' | 'unsupported'
     LP.notify.request()              Promise<permission>, gọi khi người dùng bấm nút bật
     LP.notify.show(title, body, tag) hiện một thông báo (tag giống nhau thì thay thông báo cũ) */
var LP = window.LP || (window.LP = {});

LP.notify = (function () {
  function supported() { return typeof Notification !== 'undefined'; }
  function permission() { return supported() ? Notification.permission : 'unsupported'; }
  function request() {
    if (!supported()) return Promise.resolve('unsupported');
    try { return Promise.resolve(Notification.requestPermission()); } catch (e) { return Promise.resolve(Notification.permission); }
  }
  function show(title, body, tag) {
    if (permission() === 'granted') {
      try { new Notification(title, { body: body || '', tag: tag || undefined, icon: '../icons/icon-192.png' }); return true; } catch (e) { /* rơi xuống toast */ }
    }
    LP.ui.toast(body ? title + ': ' + body : title);
    return false;
  }
  return { supported: supported, permission: permission, request: request, show: show };
})();
