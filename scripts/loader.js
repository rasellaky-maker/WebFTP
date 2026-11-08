"use strict";

// ======================================================
// STOCKPILOT — ЗАГРУЗОЧНЫЙ ЭКРАН
// ======================================================
// Подключается в <head> без defer, чтобы отсчёт времени шёл
// с самого начала загрузки страницы.
//
// Экран закрывается, когда страница полностью загрузилась
// (событие load), но не раньше минимального времени:
//  - первый визит за сессию — показываем дольше (брендовая заставка);
//  - переходы между страницами и языками — только короткая вспышка.
// Данные с API (монеты) загрузку НЕ блокируют: сервер может
// «просыпаться» долго, а сама страница уже готова.

(function () {
  const MIN_FIRST_MS = 900;    // минимальное время при первом заходе
  const MIN_REPEAT_MS = 250;   // минимальное время при повторных
  const MAX_WAIT_MS = 6000;    // страховка: закрыть в любом случае
  const FADE_MS = 700;         // запас на CSS-анимацию исчезновения
  const STORAGE_KEY = "sp-loader-seen";

  const startedAt = Date.now();
  let hidden = false;

  let seen = false;

  try {
    seen = sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Хранилище недоступно — считаем визит первым.
  }

  const minTime = seen ? MIN_REPEAT_MS : MIN_FIRST_MS;

  function hideLoader() {
    if (hidden) return;
    hidden = true;

    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Не страшно.
    }

    const loader = document.getElementById("pageLoader");

    if (!loader) return;

    loader.classList.add("is-hidden");
    loader.setAttribute("aria-hidden", "true");

    setTimeout(() => loader.remove(), FADE_MS);
  }

  function finish() {
    const wait = Math.max(0, minTime - (Date.now() - startedAt));

    setTimeout(hideLoader, wait);
  }

  if (document.readyState === "complete") {
    finish();
  } else {
    window.addEventListener("load", finish);
  }

  setTimeout(hideLoader, MAX_WAIT_MS);

  // Год в подвале (нужен и на страницах, где не подключён main.js).
  document.addEventListener("DOMContentLoaded", () => {
    const year = document.getElementById("currentYear");

    if (year && !year.textContent) {
      year.textContent = new Date().getFullYear();
    }
  });
})();
