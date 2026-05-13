/**
 * theme.js
 * Handles light/dark mode switching for SkillBridge
 * Supports multiple toggles per page and dispatches a custom event for reactive components.
 */

(function () {
    const htmlElement = document.documentElement;

    // Apply saved theme immediately (before DOMContentLoaded) to prevent flash
    const savedTheme = localStorage.getItem('theme') || 'light';
    htmlElement.setAttribute('data-theme', savedTheme);

    function updateAllIcons(theme) {
        // Support multiple theme toggles on the same page (desktop + mobile nav)
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            const sun  = btn.querySelector('#sun-icon,  .sun-icon,  [data-icon="sun"]')  || btn.querySelector('svg:last-child');
            const moon = btn.querySelector('#moon-icon, .moon-icon, [data-icon="moon"]') || btn.querySelector('svg:first-child');
            if (sun && moon) {
                sun.style.display  = theme === 'dark' ? 'block' : 'none';
                moon.style.display = theme === 'dark' ? 'none'  : 'block';
            }
        });
    }

    function applyTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateAllIcons(theme);
        // Dispatch custom event so reactive components (map, charts, etc.) can respond
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Set icons correctly on load
        updateAllIcons(savedTheme);

        // Attach click listener to every toggle button (works for dynamically added ones too)
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('.theme-toggle');
            if (!btn) return;
            const current = htmlElement.getAttribute('data-theme') || 'light';
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });
    });
})();
