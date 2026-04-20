/**
 * FILE LOCATION: frontend/static/js/config.js
 *
 * Central config — change API_BASE here and it updates everywhere.
 * Add this script FIRST in every HTML page, before any other JS.
 *
 * <script src="../static/js/config.js"></script>
 */

const CONFIG = {
  API_BASE:  'http://127.0.0.1:8000/api',
  MEDIA_BASE: 'http://127.0.0.1:8000/media',
  SERVER_BASE: 'http://127.0.0.1:8000',
  // Fallback avatar when a worker has no photo
  DEFAULT_AVATAR: 'https://i.pravatar.cc/150?u=default',
};