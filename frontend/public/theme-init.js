// Sets the platform-wide appearance (cookie "nicasso-theme", see prefs.ts) before the
// first paint, so a dark-mode user never sees a white flash. A plain same-origin file,
// not an inline script: the CSP allows only 'self'. Loaded blocking from index.html.
(function () {
  try {
    var match = document.cookie.match(/(?:^|; )nicasso-theme=(light|dark)/);
    var dark = match ? match[1] === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
