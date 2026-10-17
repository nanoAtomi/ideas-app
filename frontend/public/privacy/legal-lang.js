// Shows the legal page in the platform's language (cookie nicasso-lang, else the
// browser's) - the page carries both, as <article lang="de"> and <article lang="en">.
// The link [data-switch-lang] flips between them on this page only.
(function () {
  var match = document.cookie.match(/(?:^|; )nicasso-lang=(de|en)/);
  var lang = match ? match[1] : (navigator.language || 'de').slice(0, 2) === 'en' ? 'en' : 'de';
  function show(next) {
    lang = next;
    document.documentElement.lang = lang;
    document.querySelectorAll('article[lang]').forEach(function (article) {
      article.hidden = article.lang !== lang;
    });
    var title = document.querySelector('article[lang="' + lang + '"]');
    if (title && title.dataset.title) document.title = title.dataset.title;
  }
  show(lang);
  document.querySelectorAll('[data-switch-lang]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      show(link.dataset.switchLang);
      window.scrollTo(0, 0);
    });
  });
})();
