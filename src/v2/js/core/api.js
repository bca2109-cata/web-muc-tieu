/* V2 · chọn bản thật (Google Sheet) hoặc bản giả (mock). Xem điều kiện ở config.js (LP.config.mock). */
var LP = window.LP || (window.LP = {});

LP.settings = {
  getToken: function () { try { return localStorage.getItem(LP.config.TOKEN_KEY) || ''; } catch (e) { return ''; } },
  setToken: function (v) { try { localStorage.setItem(LP.config.TOKEN_KEY, v); } catch (e) { /* bỏ qua */ } }
};

LP.api = LP.config.mock
  ? LP.createMockApi({ failRate: parseFloat(LP.config.params.get('fail')) || 0 })
  : LP.createSheetApi({ url: LP.config.SHEET_API_URL });
