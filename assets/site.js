/* Лендинг taimen.ai: тема, язык, шапка, проход точки по схеме цикла, форма заявки.
   Без зависимостей. Страница читается и без этого файла. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;

  /* Тема: по системе, пока человек не выбрал сам. */
  doc.querySelectorAll("[data-theme-toggle]").forEach(function (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var cur = root.getAttribute("data-theme") ||
        (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      var next = cur === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* хранилище недоступно — тема на эту страницу */ }
    });
  });

  /* Язык: явный выбор запоминается и ведёт на ту же секцию другой версии. */
  var current = "";
  doc.querySelectorAll("a[data-lang]").forEach(function (a) {
    a.addEventListener("click", function () {
      doc.cookie = "lang=" + a.getAttribute("data-lang") + "; path=/; max-age=31536000; SameSite=Lax";
      var hash = current || location.hash.replace("#", "");
      if (hash) a.setAttribute("href", a.getAttribute("href").split("#")[0] + "#" + hash);
    });
  });

  var header = doc.querySelector(".lp-header");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 4); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var menu = doc.querySelector(".lp-menu");
  if (menu) {
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) menu.removeAttribute("open"); });
    doc.addEventListener("click", function (e) { if (!menu.contains(e.target)) menu.removeAttribute("open"); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") menu.removeAttribute("open"); });
  }

  if ("IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) current = en.target.id; });
    }, { rootMargin: "-40% 0px -55% 0px" });
    doc.querySelectorAll("main section[id]").forEach(function (s) { seen.observe(s); });

    /* Точка работы один раз проходит линию цикла, когда схема появляется на экране. */
    var cycle = doc.querySelector("[data-cycle]");
    var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (cycle && !still) {
      var once = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        cycle.style.setProperty("--run", (cycle.clientWidth - 28) + "px");
        cycle.classList.add("is-run");
        once.disconnect();
      }, { threshold: 0.5 });
      once.observe(cycle);
    }
  }

  /* Форма заявки. */
  var form = doc.querySelector("[data-pilot-form]");
  if (!form) return;
  var t = JSON.parse(form.querySelector("[data-form-i18n]").textContent);
  var done = form.parentNode.querySelector(".lp-form-done");
  var fail = form.querySelector(".lp-form-fail");
  var submit = form.querySelector("[type=submit]");
  var label = submit.firstChild;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function check(el) {
    var msg = "";
    if (el.type === "checkbox") { if (!el.checked) msg = t.err.consent; }
    else if (!el.value.trim()) msg = t.err.required;
    else if (el.type === "email" && !EMAIL.test(el.value.trim())) msg = t.err.email;
    var box = doc.getElementById(el.id + "-err");
    if (msg) { el.setAttribute("aria-invalid", "true"); box.lastElementChild.textContent = msg; box.hidden = false; }
    else { el.removeAttribute("aria-invalid"); box.hidden = true; }
    return !msg;
  }
  var fields = Array.prototype.slice.call(form.querySelectorAll("[required]"));
  fields.forEach(function (el) {
    el.addEventListener("blur", function () { if (el.getAttribute("aria-invalid")) check(el); });
    el.addEventListener("input", function () { if (el.getAttribute("aria-invalid")) check(el); });
    el.addEventListener("change", function () { if (el.getAttribute("aria-invalid")) check(el); });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    fail.hidden = true;
    var bad = fields.filter(function (el) { return !check(el); });
    if (bad.length) { bad[0].focus(); return; }
    var data = { lang: form.getAttribute("data-lang") };
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    submit.disabled = true;
    label.textContent = t.sending;
    fetch(form.action, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); })
      .then(function () { form.hidden = true; done.hidden = false; done.focus(); })
      .catch(function () { fail.hidden = false; })
      .then(function () { submit.disabled = false; label.textContent = t.submit; });
  });
})();
