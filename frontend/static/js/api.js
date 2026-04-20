/**
 * FILE LOCATION: frontend/static/js/api.js
 *
 * Thin fetch wrapper.
 * - Automatically prepends CONFIG.API_BASE
 * - Attaches JWT token from localStorage if present
 * - Throws a clean Error on non-2xx responses
 *
 * Usage:
 *   const workers = await api.get('/accounts/workers/');
 *   const worker  = await api.get('/accounts/workers/<uuid>/');
 */

const api = (() => {

  function _headers() {
    const h = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('access_token');
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  async function _request(method, path, body = null) {
    const url = CONFIG.API_BASE + path;
    const opts = { method, headers: _headers() };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);

    if (!res.ok) {
      let msg = `API error ${res.status}`;
      try {
        const data = await res.json();
        msg = data.detail || data.message || msg;
      } catch (_) {}
      throw new Error(msg);
    }

    if (res.status === 204) return null;
    return res.json();
  }

  return {
    get:    (path)        => _request('GET',    path),
    post:   (path, body)  => _request('POST',   path, body),
    patch:  (path, body)  => _request('PATCH',  path, body),
    delete: (path)        => _request('DELETE', path),
  };

})();