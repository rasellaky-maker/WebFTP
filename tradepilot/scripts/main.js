"use strict";

// ======================================================
// STOCKPILOT — НАСТРОЙКИ
// ======================================================

const API_BASE = "https://sep-webapi-671d.onrender.com";
const COINS_LIMIT = 12;

// Как часто тихо обновлять данные (миллисекунды).
const REFRESH_INTERVAL_MS = 3000;

// Через сколько миллисекунд после последнего введённого символа
// запускается поиск (чтобы не отправлять запрос на каждую букву).
const SEARCH_DEBOUNCE_MS = 300;

// ======================================================
// ЯЗЫК СТРАНИЦЫ (en / de / ru) — берётся из <html lang="...">
// ======================================================

const I18N = {
  en: {
    locale: "en-IE",
    noPrice: "Price not available",
    loadFailed: "Could not load data",
    unnamed: "Unnamed",
    currentPrice: "Current price",
    digitalAsset: "DIGITAL ASSET",
    showChart: "Show price chart",
    hideChart: "Hide chart",
    buyers: "Number of buyers",
    chartPeriod: "Chart period",
    chartLoading: "Loading chart…",
    retry: "Retry",
    chartUnavailable: "Chart is not available for this coin.",
    chartLoadFailed: "Could not load the chart.",
    notEnoughData: "Not enough data yet. History builds up automatically — check back a bit later.",
    min: "Min ",
    max: "Max ",
    chartLabel: "Price chart",
    noResults: "No results",
    nothingFound: "Nothing found for this query.",
    noAssets: "No assets available yet. Try refreshing the page.",
    loadingData: "Loading data…",
    loading: "Loading…",
    shown: (shown, total) => `Showing ${shown} of ${total}`,
    searchResults: count => `Search results: ${count}.`,
    unavailable: "Data temporarily unavailable",
    loadFailedLater: "Could not load data. Please try again later.",
    r1h: "1 h", r24h: "24 h", r7d: "7 d", r30d: "30 d"
  },
  de: {
    locale: "de-AT",
    noPrice: "Preis nicht angegeben",
    loadFailed: "Daten konnten nicht geladen werden",
    unnamed: "Ohne Namen",
    currentPrice: "Aktueller Preis",
    digitalAsset: "DIGITALES ASSET",
    showChart: "Preisdiagramm anzeigen",
    hideChart: "Diagramm ausblenden",
    buyers: "Anzahl der Käufer",
    chartPeriod: "Zeitraum des Diagramms",
    chartLoading: "Diagramm wird geladen…",
    retry: "Erneut versuchen",
    chartUnavailable: "Für diesen Coin ist kein Diagramm verfügbar.",
    chartLoadFailed: "Diagramm konnte nicht geladen werden.",
    notEnoughData: "Noch nicht genug Daten. Der Verlauf sammelt sich automatisch – schau etwas später wieder vorbei.",
    min: "Min ",
    max: "Max ",
    chartLabel: "Preisdiagramm",
    noResults: "Keine Ergebnisse",
    nothingFound: "Zu dieser Suche wurde nichts gefunden.",
    noAssets: "Noch keine Assets verfügbar. Versuche, die Seite neu zu laden.",
    loadingData: "Daten werden geladen…",
    loading: "Wird geladen…",
    shown: (shown, total) => `${shown} von ${total} angezeigt`,
    searchResults: count => `Suchergebnisse: ${count}.`,
    unavailable: "Daten vorübergehend nicht verfügbar",
    loadFailedLater: "Daten konnten nicht geladen werden. Bitte versuche es später erneut.",
    r1h: "1 Std", r24h: "24 Std", r7d: "7 T", r30d: "30 T"
  },
  ru: {
    locale: "ru-RU",
    noPrice: "Цена не указана",
    loadFailed: "Не удалось загрузить данные",
    unnamed: "Без названия",
    currentPrice: "Текущая цена",
    digitalAsset: "ЦИФРОВОЙ АКТИВ",
    showChart: "Показать график цены",
    hideChart: "Скрыть график",
    buyers: "Количество покупателей",
    chartPeriod: "Период графика",
    chartLoading: "Загружаем график…",
    retry: "Повторить",
    chartUnavailable: "График для этой монеты недоступен.",
    chartLoadFailed: "Не удалось загрузить график.",
    notEnoughData: "Пока недостаточно данных. История копится автоматически — загляни чуть позже.",
    min: "Мин ",
    max: "Макс ",
    chartLabel: "График цены",
    noResults: "Нет результатов",
    nothingFound: "По этому запросу ничего не найдено.",
    noAssets: "Пока нет доступных активов. Попробуй обновить страницу.",
    loadingData: "Загружаем данные…",
    loading: "Загрузка…",
    shown: (shown, total) => `Показано ${shown} из ${total}`,
    searchResults: count => `Результаты поиска: ${count}.`,
    unavailable: "Данные временно недоступны",
    loadFailedLater: "Не удалось загрузить данные. Попробуй немного позже.",
    r1h: "1 ч", r24h: "24 ч", r7d: "7 дн", r30d: "30 дн"
  }
};

const LANG = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
const L = I18N[LANG] || I18N.en;
const LOCALE = L.locale;

// ======================================================
// ЭЛЕМЕНТЫ СТРАНИЦЫ
// ======================================================

const coinsEl = document.getElementById("coins");
const statusEl = document.getElementById("status");
const coinCountEl = document.getElementById("coinCount");

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const clearSearchButton = document.getElementById("clearSearch");

const currentYearEl = document.getElementById("currentYear");

let requestCounter = 0;

// Состояние автообновления.
let refreshTimer = null;
let isManualLoading = false;
let lastSignature = null;
let activeQuery = "";

const euroFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 8
});

const numberFormatter = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0
});

// ======================================================
// ИНИЦИАЛИЗАЦИЯ
// ======================================================

if (currentYearEl) {
  currentYearEl.textContent = new Date().getFullYear();
}

// ======================================================
// ОБЩИЕ ФУНКЦИИ
// ======================================================

function setStatus(message = "", isError = false) {
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.classList.toggle("status-error", isError);
}

function setCoinCount(message) {
  if (coinCountEl) {
    coinCountEl.textContent = message;
  }
}

function setLoading(isLoading) {
  if (coinsEl) {
    coinsEl.setAttribute("aria-busy", String(isLoading));
  }
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const result = String(value).trim();

  return result || fallback;
}

// Получение данных независимо от регистра названий полей.
// Поддерживаются, например, Name и name, Image и image.
function getField(object, names) {
  if (!object || typeof object !== "object") {
    return undefined;
  }

  for (const name of names) {
    if (
      object[name] !== undefined &&
      object[name] !== null &&
      object[name] !== ""
    ) {
      return object[name];
    }
  }

  const keys = Object.keys(object);

  for (const name of names) {
    const matchingKey = keys.find(
      key => key.toLowerCase() === name.toLowerCase()
    );

    if (
      matchingKey &&
      object[matchingKey] !== undefined &&
      object[matchingKey] !== null &&
      object[matchingKey] !== ""
    ) {
      return object[matchingKey];
    }
  }

  return undefined;
}

// ======================================================
// ФОРМАТИРОВАНИЕ
// ======================================================

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return L.noPrice;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return L.noPrice;
  }

  return euroFormatter.format(number);
}

function formatBuyers(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return numberFormatter.format(number);
}

// ======================================================
// API
// ======================================================

async function getJson(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    // Не брать ответ из кэша браузера: иначе повторные запросы
    // могут возвращать старые данные.
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  if (response.status === 404 || response.status === 204) {
    return [];
  }

  if (!response.ok) {
    throw new Error(L.loadFailed);
  }

  return response.json();
}

function normalizeCoins(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const list = getField(data, [
    "items",
    "data",
    "results",
    "coins"
  ]);

  if (Array.isArray(list)) {
    return list;
  }

  if (
    getField(data, ["name"]) !== undefined ||
    getField(data, ["id"]) !== undefined
  ) {
    return [data];
  }

  return [];
}

// ======================================================
// ДАННЫЕ МОНЕТ
// ======================================================

function getCoinName(coin) {
  return safeText(
    getField(coin, ["name", "coinName"]),
    L.unnamed
  );
}

function getCoinSymbol(coin) {
  const symbol = getField(coin, [
    "symbol",
    "coinSymbol",
    "ticker",
    "code",
    "abbreviation",
    "shortName"
  ]);

  if (symbol !== undefined) {
    return safeText(symbol, "").toUpperCase();
  }

  // В текущей таблице MySQL отдельного поля Symbol нет.
  // Поэтому для известных монет определяем символ по названию.
  const name = getCoinName(coin)
    .toLowerCase()
    .replace(/[\s._-]/g, "");

  const knownSymbols = {
    bitcoin: "BTC",
    ethereum: "ETH",
    ethereumclassic: "ETC",
    tether: "USDT",
    binancecoin: "BNB",
    solana: "SOL",
    ripple: "XRP",
    dogecoin: "DOGE",
    cardano: "ADA",
    litecoin: "LTC",
    polkadot: "DOT",
    avalanche: "AVAX",
    chainlink: "LINK",
    polygon: "POL",
    tron: "TRX"
  };

  return knownSymbols[name] || "";
}

function getCoinPrice(coin) {
  return getField(coin, [
    "value",
    "price"
  ]);
}

function getCoinBuyers(coin) {
  return getField(coin, [
    "numberOfBuyers",
    "buyers"
  ]);
}

// ======================================================
// ИЗОБРАЖЕНИЯ ИЗ MYSQL
// ======================================================

// MySQL возвращает изображение через поле Image.
// Значение может быть Base64, Data URL или обычным URL.
function getCoinImage(coin) {
  const image = getField(coin, [
    "image",
    "imageUrl",
    "imageURL",
    "imagePath",
    "imageName",
    "imageBase64",
    "picture",
    "photo",
    "logo",
    "coinImage",
    "icon"
  ]);

  if (typeof image === "string") {
    return image.trim() || null;
  }

  // Дополнительная поддержка, если API возвращает объект.
  if (image && typeof image === "object") {
    const nestedImage = getField(image, [
      "url",
      "path",
      "src",
      "data",
      "base64"
    ]);

    if (typeof nestedImage === "string" && nestedImage.trim()) {
      return nestedImage.trim();
    }
  }

  return null;
}

// Определяем тип изображения и преобразуем Base64 в Data URL.
function getImageCandidates(imagePath) {
  if (typeof imagePath !== "string" || !imagePath.trim()) {
    return [];
  }

  const source = imagePath.trim();

  // Если Data URL уже готов, используем его напрямую.
  if (/^data:image\//i.test(source)) {
    return [source];
  }

  // Убираем пробелы и переводы строк внутри Base64.
  const cleaned = source.replace(/\s/g, "");

  // JPEG Base64 обычно начинается с /9j/.
  if (cleaned.startsWith("/9j/")) {
    return [`data:image/jpeg;base64,${cleaned}`];
  }

  // PNG.
  if (cleaned.startsWith("iVBORw0KGgo")) {
    return [`data:image/png;base64,${cleaned}`];
  }

  // GIF.
  if (cleaned.startsWith("R0lGOD")) {
    return [`data:image/gif;base64,${cleaned}`];
  }

  // WebP.
  if (cleaned.startsWith("UklGR")) {
    return [`data:image/webp;base64,${cleaned}`];
  }

  // SVG: "<?xml" в Base64 начинается с PD94,
  // "<svg" — с PHN2Zy.
  if (cleaned.startsWith("PD94") || cleaned.startsWith("PHN2Zy")) {
    return [`data:image/svg+xml;base64,${cleaned}`];
  }

  // Если это другая длинная строка Base64 — пробуем как JPEG.
  if (
    cleaned.length > 100 &&
    /^[A-Za-z0-9+/=]+$/.test(cleaned)
  ) {
    return [`data:image/jpeg;base64,${cleaned}`];
  }

  // Обычная абсолютная ссылка.
  try {
    const absoluteUrl = new URL(source);

    if (
      absoluteUrl.protocol === "http:" ||
      absoluteUrl.protocol === "https:"
    ) {
      return [absoluteUrl.href];
    }

    return [];
  } catch {
    // Это может быть относительный путь.
  }

  // Относительные пути: сначала исходное значение,
  // затем адрес, разрешённый относительно API.
  const candidates = [source];

  try {
    const apiUrl = new URL(source, `${API_BASE}/`).href;

    if (!candidates.includes(apiUrl)) {
      candidates.push(apiUrl);
    }
  } catch {
    // Некорректный путь пропускаем.
  }

  return candidates;
}

// ======================================================
// СОЗДАНИЕ ИЗОБРАЖЕНИЯ
// ======================================================

function createCoinImage(imagePath, fallbackText, extraClass = "") {
  const wrapper = document.createElement("div");

  wrapper.className = extraClass
    ? `coin-image-wrap ${extraClass}`
    : "coin-image-wrap";

  // Запасной вариант, когда картинка отсутствует.
  const fallback = document.createElement("span");

  fallback.className = "coin-fallback";

  fallback.textContent =
    safeText(fallbackText, "?").charAt(0).toUpperCase() || "?";

  wrapper.appendChild(fallback);

  const candidates = getImageCandidates(imagePath);

  if (candidates.length === 0) {
    return wrapper;
  }

  const image = document.createElement("img");

  image.className =
    extraClass === "coin-price-image"
      ? "coin-price-logo"
      : "coin-image";

  image.alt = "";
  image.decoding = "async";

  // loading="lazy" для data: URL не нужен и может задерживать
  // показ картинки, поэтому включаем его только для обычных ссылок.
  if (!candidates[0].startsWith("data:")) {
    image.loading = "lazy";
  }

  let candidateIndex = 0;

  image.addEventListener("load", () => {
    // style.display надёжнее, чем hidden: работает,
    // даже если в CSS у .coin-fallback задан display.
    fallback.style.display = "none";
  });

  image.addEventListener("error", () => {
    candidateIndex += 1;

    if (candidateIndex < candidates.length) {
      image.src = candidates[candidateIndex];
    } else {
      image.remove();
      fallback.style.display = "";
    }
  });

  image.src = candidates[0];

  wrapper.appendChild(image);

  return wrapper;
}

// ======================================================
// БЛОК ЦЕНЫ
// ======================================================

function createPriceArea(coin, imagePath, symbol, name) {
  const priceArea = document.createElement("div");
  priceArea.className = "coin-price-area";

  const priceInfo = document.createElement("div");

  const priceLabel = document.createElement("span");
  priceLabel.className = "coin-price-label";
  priceLabel.textContent = L.currentPrice;

  const price = document.createElement("strong");
  price.className = "coin-price";
  price.textContent = formatPrice(getCoinPrice(coin));

  priceInfo.append(priceLabel, price);

  // Изображение монеты вместо SVG-графика.
  const priceImage = createCoinImage(
    imagePath,
    symbol || name,
    "coin-price-image"
  );

  priceArea.append(priceInfo, priceImage);

  return priceArea;
}

// ======================================================
// ГРАФИК ИСТОРИИ ЦЕН — НАСТРОЙКИ
// ======================================================

// refreshMs — как часто обновлять открытый график для периода.
// Длинные периоды обновляем реже: сервер считает их дороже.
const HISTORY_RANGES = [
  { key: "1h",  label: L.r1h,   refreshMs: 5000 },
  { key: "24h", label: L.r24h,  refreshMs: 15000 },
  { key: "7d",  label: L.r7d,  refreshMs: 60000 },
  { key: "30d", label: L.r30d, refreshMs: 60000 }
];

const DEFAULT_RANGE = "1h";
const VIENNA_TZ = "Europe/Vienna";

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit", minute: "2-digit", timeZone: VIENNA_TZ
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit", month: "2-digit", timeZone: VIENNA_TZ
});

const fullTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit", month: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  timeZone: VIENNA_TZ
});

const percentFormatter = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  signDisplay: "always",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// Состояние раскрытой карточки.
let expandedKey = null;
let selectedRange = DEFAULT_RANGE;
let panelCounter = 0;

// Все карточки на странице: ключ монеты -> объект карточки.
const cardRegistry = new Map();
let renderedKeys = [];

// ======================================================
// КАРТОЧКА МОНЕТЫ
// ======================================================

function getCoinId(coin) {
  return getField(coin, ["id", "coinId"]);
}

function getCoinKey(coin) {
  const id = getCoinId(coin);

  return String(id !== undefined ? id : getCoinName(coin));
}

function prefersReducedMotion() {
  return window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function createCoinCard(coin, index) {
  const key = getCoinKey(coin);
  const name = getCoinName(coin);
  const symbol = getCoinSymbol(coin);
  const imagePath = getCoinImage(coin);

  const card = document.createElement("article");
  card.className = "coin-card";

  // Кликабельная часть карточки.
  const summary = document.createElement("div");
  summary.className = "coin-summary";
  summary.tabIndex = 0;
  summary.setAttribute("role", "button");
  summary.setAttribute("aria-expanded", "false");
  summary.title = L.showChart;

  // Верхняя часть.
  const top = document.createElement("div");
  top.className = "coin-card-top";

  const icon = createCoinImage(imagePath, symbol || name);

  const heading = document.createElement("div");
  heading.className = "coin-heading";

  const title = document.createElement("h3");
  title.className = "coin-name";
  title.textContent = name;

  const symbolLabel = document.createElement("span");
  symbolLabel.className = "coin-symbol";
  symbolLabel.textContent = symbol || L.digitalAsset;

  heading.append(title, symbolLabel);

  const tag = document.createElement("span");
  tag.className = "coin-tag";
  tag.textContent = `#${index + 1}`;

  const chevron = document.createElement("span");
  chevron.className = "coin-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "▾";

  top.append(icon, heading, tag, chevron);

  const divider = document.createElement("div");
  divider.className = "coin-divider";

  const priceArea = createPriceArea(coin, imagePath, symbol, name);

  const buyers = document.createElement("div");
  buyers.className = "coin-buyers";

  const buyersLabel = document.createElement("span");
  buyersLabel.textContent = L.buyers;

  const buyersValue = document.createElement("strong");
  buyersValue.textContent = formatBuyers(getCoinBuyers(coin));

  buyers.append(buyersLabel, buyersValue);

  summary.append(top, divider, priceArea, buyers);

  // Раскрывающаяся часть с графиком (заполняется при первом открытии).
  const details = document.createElement("div");
  details.className = "coin-details";

  const detailsInner = document.createElement("div");
  detailsInner.className = "coin-details-inner";

  details.appendChild(detailsInner);

  card.append(summary, details);

  const view = {
    key,
    coinId: getCoinId(coin),
    card,
    summary,
    detailsInner,
    icon,
    title,
    symbolLabel,
    tag,
    priceEl: priceArea.querySelector(".coin-price"),
    priceImage: priceArea.querySelector(".coin-price-image"),
    buyersValue,
    imagePath,
    price: Number(getCoinPrice(coin)),
    panel: null
  };

  summary.addEventListener("click", () => toggleCoin(key));

  summary.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleCoin(key);
    }
  });

  return view;
}

// Обновляем уже существующую карточку на месте:
// раскрытое состояние и график при этом не сбрасываются.
function updateCoinCard(view, coin, index) {
  const name = getCoinName(coin);
  const symbol = getCoinSymbol(coin);
  const imagePath = getCoinImage(coin);

  view.title.textContent = name;
  view.symbolLabel.textContent = symbol || L.digitalAsset;
  view.tag.textContent = `#${index + 1}`;
  view.buyersValue.textContent = formatBuyers(getCoinBuyers(coin));

  const rawPrice = getCoinPrice(coin);
  const price = Number(rawPrice);

  view.priceEl.textContent = formatPrice(rawPrice);

  // Короткая подсветка цены при изменении.
  if (Number.isFinite(price) && Number.isFinite(view.price) && price !== view.price) {
    const cls = price > view.price ? "flash-up" : "flash-down";

    view.priceEl.classList.remove("flash-up", "flash-down");
    void view.priceEl.offsetWidth; // перезапуск анимации
    view.priceEl.classList.add(cls);
  }

  view.price = price;

  if (imagePath !== view.imagePath) {
    const newIcon = createCoinImage(imagePath, symbol || name);
    view.icon.replaceWith(newIcon);
    view.icon = newIcon;

    const newPriceImage = createCoinImage(imagePath, symbol || name, "coin-price-image");
    view.priceImage.replaceWith(newPriceImage);
    view.priceImage = newPriceImage;

    view.imagePath = imagePath;
  }
}

// ======================================================
// РАСКРЫТИЕ КАРТОЧКИ
// ======================================================

function setExpanded(key, expanded) {
  const view = cardRegistry.get(key);

  if (!view) return;

  view.card.classList.toggle("is-expanded", expanded);
  view.summary.setAttribute("aria-expanded", String(expanded));
  view.summary.title = expanded ? L.hideChart : L.showChart;

  if (!expanded) return;

  if (!view.panel) {
    view.panel = createHistoryPanel(view);
    view.detailsInner.appendChild(view.panel.root);
  }

  syncTabs(view.panel);
  loadHistory(view.panel);
}

function toggleCoin(key) {
  if (expandedKey === key) {
    setExpanded(key, false);
    expandedKey = null;
    return;
  }

  if (expandedKey !== null) {
    setExpanded(expandedKey, false);
  }

  expandedKey = key;
  setExpanded(key, true);

  // Когда карточка раскроется — показываем её целиком.
  const view = cardRegistry.get(key);

  if (view) {
    setTimeout(() => {
      view.card.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "nearest"
      });
    }, 320);
  }
}

function collapseExpanded() {
  if (expandedKey === null) return false;

  const view = cardRegistry.get(expandedKey);

  setExpanded(expandedKey, false);
  expandedKey = null;

  if (view) view.summary.focus();

  return true;
}

// ======================================================
// ПАНЕЛЬ ГРАФИКА
// ======================================================

function createHistoryPanel(view) {
  const root = document.createElement("div");
  root.className = "history";

  // Шапка: изменение цены, мин/макс и выбор периода.
  const head = document.createElement("div");
  head.className = "history-head";

  const stats = document.createElement("div");
  stats.className = "history-stats";

  const changeEl = document.createElement("span");
  changeEl.className = "history-change";

  const minmaxEl = document.createElement("span");
  minmaxEl.className = "history-minmax";

  stats.append(changeEl, minmaxEl);

  const tabs = document.createElement("div");
  tabs.className = "history-tabs";
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", L.chartPeriod);

  const tabButtons = HISTORY_RANGES.map(range => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "history-tab";
    button.setAttribute("role", "tab");
    button.dataset.range = range.key;
    button.textContent = range.label;

    button.addEventListener("click", () => setRange(range.key));

    return button;
  });

  tabs.append(...tabButtons);
  head.append(stats, tabs);

  // Область графика.
  const chartEl = document.createElement("div");
  chartEl.className = "history-chart";

  const plotEl = document.createElement("div");
  plotEl.className = "history-plot";

  const tooltipEl = document.createElement("div");
  tooltipEl.className = "history-tooltip";

  const messageEl = document.createElement("div");
  messageEl.className = "history-message";
  messageEl.setAttribute("role", "status");

  chartEl.append(plotEl, tooltipEl, messageEl);
  root.append(head, chartEl);

  const panel = {
    uid: ++panelCounter,
    view,
    root,
    changeEl,
    minmaxEl,
    tabButtons,
    chartEl,
    plotEl,
    tooltipEl,
    messageEl,
    points: [],
    loadedAt: 0,
    requestToken: 0,
    loading: false,
    geom: null,
    refs: null,
    drawnWidth: 0
  };

  chartEl.addEventListener("pointermove", event => onChartHover(panel, event));
  chartEl.addEventListener("pointerleave", () => hideHover(panel));

  // Перерисовываем график при изменении ширины.
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => {
      if (
        panel.points.length >= 2 &&
        panel.chartEl.clientWidth !== panel.drawnWidth
      ) {
        drawChart(panel);
      }
    }).observe(chartEl);
  }

  return panel;
}

function syncTabs(panel) {
  for (const button of panel.tabButtons) {
    button.setAttribute(
      "aria-selected",
      String(button.dataset.range === selectedRange)
    );
  }
}

function setRange(key) {
  if (key === selectedRange) return;

  selectedRange = key;

  const view = cardRegistry.get(expandedKey);

  if (!view || !view.panel) return;

  const panel = view.panel;

  syncTabs(panel);

  panel.points = [];
  panel.loadedAt = 0;

  clearPlot(panel);
  showMessage(panel, L.chartLoading);
  loadHistory(panel);
}

function showMessage(panel, text, withRetry = false) {
  panel.messageEl.hidden = false;
  panel.messageEl.replaceChildren();

  const label = document.createElement("span");
  label.textContent = text;
  panel.messageEl.appendChild(label);

  if (withRetry) {
    const retry = document.createElement("button");

    retry.type = "button";
    retry.className = "history-retry";
    retry.textContent = L.retry;
    retry.addEventListener("click", () => {
      showMessage(panel, L.chartLoading);
      loadHistory(panel);
    });

    panel.messageEl.appendChild(retry);
  }
}

function hideMessage(panel) {
  panel.messageEl.hidden = true;
  panel.messageEl.replaceChildren();
}

function clearPlot(panel) {
  panel.plotEl.replaceChildren();
  panel.changeEl.textContent = "";
  panel.minmaxEl.replaceChildren();
  panel.geom = null;
  panel.refs = null;
  panel.drawnWidth = 0;
  hideHover(panel);
}

// ======================================================
// ЗАГРУЗКА ИСТОРИИ
// ======================================================

function parseHistory(data) {
  const list = Array.isArray(data) ? data : normalizeCoins(data);
  const result = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;

    const rawTime = getField(item, ["time", "recordedAt", "date", "timestamp"]);
    const rawPrice = getField(item, ["price", "value"]);

    const value = Number(rawPrice);
    let time;

    if (typeof rawTime === "number") {
      time = rawTime;
    } else {
      let text = safeText(rawTime);

      // Если сервер прислал время без часового пояса — это UTC.
      if (text && !/(z|[+-]\d{2}:?\d{2})$/i.test(text)) {
        text += "Z";
      }

      time = Date.parse(text);
    }

    if (Number.isFinite(time) && Number.isFinite(value)) {
      result.push({ t: time, v: value });
    }
  }

  result.sort((a, b) => a.t - b.t);

  return result;
}

async function loadHistory(panel, { silent = false } = {}) {
  const coinId = panel.view.coinId;

  if (coinId === undefined) {
    showMessage(panel, L.chartUnavailable);
    return;
  }

  // Фоновое обновление не накладываем на предыдущий запрос.
  if (silent && panel.loading) return;

  const token = ++panel.requestToken;
  const range = selectedRange;

  panel.loading = true;

  if (!silent && panel.points.length === 0) {
    showMessage(panel, L.chartLoading);
  }

  try {
    const data = await getJson(
      `/api/Coin/${encodeURIComponent(coinId)}/history?range=${encodeURIComponent(range)}`
    );

    // Пока шёл запрос, пользователь мог сменить период или монету.
    if (token !== panel.requestToken || range !== selectedRange) return;

    panel.points = parseHistory(data);
    panel.loadedAt = Date.now();

    renderPanel(panel);
  } catch {
    if (token !== panel.requestToken) return;

    // При сбое фонового обновления оставляем прежний график.
    if (silent && panel.points.length > 0) return;

    clearPlot(panel);
    showMessage(panel, L.chartLoadFailed, true);
  } finally {
    if (token === panel.requestToken) {
      panel.loading = false;
    }
  }
}

// Вызывается по таймеру автообновления.
function refreshOpenChart() {
  if (expandedKey === null) return;

  const view = cardRegistry.get(expandedKey);

  if (!view || !view.panel) return;

  const config = HISTORY_RANGES.find(range => range.key === selectedRange);
  const interval = config ? config.refreshMs : 15000;

  if (Date.now() - view.panel.loadedAt >= interval) {
    loadHistory(view.panel, { silent: true });
  }
}

// ======================================================
// ОТРИСОВКА ГРАФИКА (SVG)
// ======================================================

function renderPanel(panel) {
  if (panel.points.length < 2) {
    clearPlot(panel);
    showMessage(
      panel,
      L.notEnoughData
    );
    return;
  }

  hideMessage(panel);
  drawChart(panel);
  updateStats(panel);
}

function updateStats(panel) {
  const points = panel.points;
  const first = points[0].v;
  const last = points[points.length - 1].v;

  let min = Infinity;
  let max = -Infinity;

  for (const point of points) {
    if (point.v < min) min = point.v;
    if (point.v > max) max = point.v;
  }

  panel.changeEl.textContent =
    first !== 0 ? percentFormatter.format((last - first) / first) : "—";

  const minStrong = document.createElement("strong");
  minStrong.textContent = formatPrice(min);

  const maxStrong = document.createElement("strong");
  maxStrong.textContent = formatPrice(max);

  panel.minmaxEl.replaceChildren(
    document.createTextNode(L.min),
    minStrong,
    document.createTextNode("  ·  " + L.max),
    maxStrong
  );
}

// Количество знаков на оси зависит от размаха значений.
function formatAxisPrice(value, span) {
  let digits = 0;

  if (span < 0.01) digits = 6;
  else if (span < 1) digits = 4;
  else if (span < 100) digits = 2;

  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

function drawChart(panel) {
  const width = panel.chartEl.clientWidth;
  const height = panel.chartEl.clientHeight || 240;
  const points = panel.points;

  if (!width || points.length < 2) return;

  panel.drawnWidth = width;

  const margin = {
    top: 12,
    right: 14,
    bottom: 26,
    left: width < 420 ? 52 : 64
  };

  const plotW = Math.max(width - margin.left - margin.right, 10);
  const plotH = Math.max(height - margin.top - margin.bottom, 10);

  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const tSpan = Math.max(t1 - t0, 1);

  let min = Infinity;
  let max = -Infinity;

  for (const point of points) {
    if (point.v < min) min = point.v;
    if (point.v > max) max = point.v;
  }

  // Небольшой отступ, чтобы линия не прилипала к краям.
  let pad = (max - min) * 0.08;

  if (pad === 0) pad = Math.abs(max) * 0.01 || 1;

  const yLow = min - pad;
  const yHigh = max + pad;

  const x = time => margin.left + ((time - t0) / tSpan) * plotW;
  const y = value => margin.top + (1 - (value - yLow) / (yHigh - yLow)) * plotH;

  const isUp = points[points.length - 1].v >= points[0].v;
  panel.root.classList.toggle("is-down", !isUp);

  const linePath = points
    .map((point, i) => `${i ? "L" : "M"}${x(point.t).toFixed(1)},${y(point.v).toFixed(1)}`)
    .join("");

  const bottom = margin.top + plotH;
  const areaPath =
    `${linePath}L${x(t1).toFixed(1)},${bottom}L${x(t0).toFixed(1)},${bottom}Z`;

  // Горизонтальные линии сетки и подписи цен.
  let grid = "";

  for (let i = 0; i < 4; i += 1) {
    const value = yHigh - ((yHigh - yLow) * i) / 3;
    const yy = (margin.top + (plotH * i) / 3).toFixed(1);

    grid +=
      `<line class="chart-grid" x1="${margin.left}" x2="${width - margin.right}" y1="${yy}" y2="${yy}"/>` +
      `<text class="chart-label" x="${margin.left - 8}" y="${Number(yy) + 3.5}" text-anchor="end">` +
      `${formatAxisPrice(value, yHigh - yLow)}</text>`;
  }

  // Подписи времени: для коротких периодов — часы, для длинных — даты.
  const tickFormatter = tSpan <= 36 * 3600 * 1000 ? timeFormatter : dateFormatter;
  let ticks = "";

  for (let i = 0; i < 5; i += 1) {
    const time = t0 + (tSpan * i) / 4;
    const anchor = i === 0 ? "start" : i === 4 ? "end" : "middle";

    ticks +=
      `<text class="chart-label" x="${x(time).toFixed(1)}" y="${height - 6}" text-anchor="${anchor}">` +
      `${tickFormatter.format(new Date(time))}</text>`;
  }

  const gradId = `history-grad-${panel.uid}`;

  panel.plotEl.innerHTML =
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${L.chartLabel}">` +
    `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" style="stop-color:var(--trend);stop-opacity:.28"/>` +
    `<stop offset="1" style="stop-color:var(--trend);stop-opacity:0"/>` +
    `</linearGradient></defs>` +
    grid +
    ticks +
    `<path d="${areaPath}" fill="url(#${gradId})"/>` +
    `<path class="chart-line" d="${linePath}"/>` +
    `<line class="chart-cursor" x1="0" x2="0" y1="${margin.top}" y2="${bottom}" style="opacity:0"/>` +
    `<circle class="chart-dot" r="4" cx="0" cy="0" style="opacity:0"/>` +
    `</svg>`;

  panel.refs = {
    cursor: panel.plotEl.querySelector(".chart-cursor"),
    dot: panel.plotEl.querySelector(".chart-dot")
  };

  panel.geom = { margin, plotW, width, t0, tSpan, x, y };
}

// ---------- наведение курсора ----------

function hideHover(panel) {
  panel.tooltipEl.style.opacity = "0";

  if (panel.refs) {
    panel.refs.cursor.style.opacity = "0";
    panel.refs.dot.style.opacity = "0";
  }
}

function onChartHover(panel, event) {
  const geom = panel.geom;

  if (!geom || !panel.refs) return;

  const rect = panel.chartEl.getBoundingClientRect();
  const px = event.clientX - rect.left;

  if (px < geom.margin.left - 6 || px > geom.width - geom.margin.right + 6) {
    hideHover(panel);
    return;
  }

  const time = geom.t0 + ((px - geom.margin.left) / geom.plotW) * geom.tSpan;
  const points = panel.points;

  // Бинарный поиск ближайшей точки.
  let low = 0;
  let high = points.length - 1;

  while (low < high) {
    const mid = (low + high) >> 1;

    if (points[mid].t < time) low = mid + 1;
    else high = mid;
  }

  if (low > 0 && Math.abs(points[low - 1].t - time) < Math.abs(points[low].t - time)) {
    low -= 1;
  }

  const point = points[low];
  const cx = geom.x(point.t);
  const cy = geom.y(point.v);

  panel.refs.cursor.setAttribute("x1", cx);
  panel.refs.cursor.setAttribute("x2", cx);
  panel.refs.cursor.style.opacity = "1";

  panel.refs.dot.setAttribute("cx", cx);
  panel.refs.dot.setAttribute("cy", cy);
  panel.refs.dot.style.opacity = "1";

  const price = document.createElement("strong");
  price.textContent = formatPrice(point.v);

  const when = document.createElement("span");
  when.textContent = fullTimeFormatter.format(new Date(point.t));

  panel.tooltipEl.replaceChildren(price, when);

  // Подсказка справа от точки, а у правого края — слева.
  const flip = cx > geom.width * 0.6;

  panel.tooltipEl.style.left = `${cx}px`;
  panel.tooltipEl.style.top = "6px";
  panel.tooltipEl.style.transform = flip
    ? "translateX(calc(-100% - 12px))"
    : "translateX(12px)";
  panel.tooltipEl.style.opacity = "1";
}

// ======================================================
// ОТОБРАЖЕНИЕ КАРТОЧЕК
// ======================================================

// Удаляем все карточки (при загрузке, поиске, ошибке).
function clearCards() {
  if (coinsEl) {
    coinsEl.replaceChildren();
  }

  cardRegistry.clear();
  renderedKeys = [];
  expandedKey = null;
}

function renderCoins(coins) {
  if (!coinsEl) return;

  const validCoins = coins.filter(coin => coin && typeof coin === "object");
  const keys = validCoins.map(getCoinKey);

  const sameLayout =
    cardRegistry.size === keys.length &&
    keys.length === renderedKeys.length &&
    keys.every((key, i) => key === renderedKeys[i]);

  // Набор монет не изменился — обновляем карточки на месте.
  // Так раскрытая карточка и график не закрываются при автообновлении.
  if (sameLayout) {
    validCoins.forEach((coin, i) => {
      updateCoinCard(cardRegistry.get(keys[i]), coin, i);
    });

    return;
  }

  const previouslyExpanded = expandedKey;

  coinsEl.replaceChildren();
  cardRegistry.clear();

  const fragment = document.createDocumentFragment();

  validCoins.forEach((coin, index) => {
    const view = createCoinCard(coin, index);

    cardRegistry.set(view.key, view);
    fragment.appendChild(view.card);
  });

  coinsEl.appendChild(fragment);
  renderedKeys = keys;

  // Если раскрытая монета осталась в списке — раскрываем её снова.
  if (previouslyExpanded !== null && cardRegistry.has(previouslyExpanded)) {
    expandedKey = previouslyExpanded;
    setExpanded(previouslyExpanded, true);
  } else {
    expandedKey = null;
  }
}

function showSkeletons() {
  if (!coinsEl) return;

  clearCards();

  const fragment = document.createDocumentFragment();

  for (let index = 0; index < 6; index += 1) {
    const skeleton = document.createElement("div");

    skeleton.className = "coin-skeleton";
    skeleton.setAttribute("aria-hidden", "true");

    fragment.appendChild(skeleton);
  }

  coinsEl.appendChild(fragment);
}

function showEmptyState(query) {
  clearCards();

  setCoinCount(L.noResults);

  setStatus(
    query
      ? L.nothingFound
      : L.noAssets
  );
}

// ======================================================
// ЗАГРУЗКА И ПОИСК
// ======================================================

// silent = true: фоновое обновление без скелетонов и сообщений.
async function run({ silent = false } = {}) {
  if (!coinsEl) return;

  // Ручной запуск запоминает запрос из поля поиска.
  // Фоновое обновление использует последний применённый запрос,
  // а не то, что пользователь печатает прямо сейчас.
  if (!silent) {
    activeQuery = searchInput ? searchInput.value.trim() : "";
  }

  const query = activeQuery;
  const currentRequest = ++requestCounter;

  if (!silent) {
    isManualLoading = true;
    lastSignature = null;

    setLoading(true);
    showSkeletons();

    setStatus(L.loadingData);
    setCoinCount(L.loading);

    if (clearSearchButton) {
      clearSearchButton.hidden = query.length === 0;
    }
  }

  try {
    let data;

    if (query) {
      data = await getJson(
        `/api/Coin/search/${encodeURIComponent(query)}`
      );
    } else {
      data = await getJson("/api/Coin/GetAll");
    }

    // Не показываем результаты устаревшего запроса.
    if (currentRequest !== requestCounter) {
      return;
    }

    const allCoins = normalizeCoins(data);

    const validCoins = allCoins.filter(coin => {
      if (!coin || typeof coin !== "object") {
        return false;
      }

      const name = getField(coin, ["name"]);
      const id = getField(coin, ["id"]);
      const image = getCoinImage(coin);
      const symbol = getCoinSymbol(coin);

      return Boolean(
        name ||
        id !== undefined ||
        image ||
        symbol
      );
    });

    // На главной показываем первые 12 активов.
    const coins = validCoins.slice(0, COINS_LIMIT);

    // Если данные не изменились, ничего не перерисовываем:
    // так карточки и картинки не мигают каждые 3 секунды.
    const signature = JSON.stringify([query, validCoins.length, coins]);

    if (silent && signature === lastSignature) {
      return;
    }

    lastSignature = signature;

    if (coins.length === 0) {
      showEmptyState(query);
      return;
    }

    renderCoins(coins);

    setCoinCount(
      L.shown(coins.length, validCoins.length)
    );

    setStatus(
      query
        ? L.searchResults(coins.length)
        : ""
    );
  } catch {
    if (currentRequest !== requestCounter) {
      return;
    }

    // При сбое фонового обновления оставляем на экране
    // последние успешно загруженные данные.
    if (silent && lastSignature !== null) {
      return;
    }

    lastSignature = null;
    clearCards();

    setCoinCount(L.unavailable);

    setStatus(
      L.loadFailedLater,
      true
    );
  } finally {
    if (!silent && currentRequest === requestCounter) {
      isManualLoading = false;
      setLoading(false);
    }
  }
}

// ======================================================
// АВТООБНОВЛЕНИЕ
// ======================================================

// Следующий запрос планируется только после завершения предыдущего,
// поэтому запросы не накладываются друг на друга.
function scheduleRefresh() {
  clearTimeout(refreshTimer);

  refreshTimer = setTimeout(async () => {
    if (!document.hidden && !isManualLoading) {
      await run({ silent: true });
      refreshOpenChart();
    }

    scheduleRefresh();
  }, REFRESH_INTERVAL_MS);
}

// Вкладка снова стала активной — сразу обновляем данные.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !isManualLoading) {
    run({ silent: true });
    refreshOpenChart();
    scheduleRefresh();
  }
});

// ======================================================
// СОБЫТИЯ
// ======================================================

// Поиск по названию или символу.
if (searchForm) {
  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    cancelPendingSearch();
    run();
    scheduleRefresh();
  });
}

// Очистка поисковой строки.
if (clearSearchButton) {
  clearSearchButton.addEventListener("click", () => {
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }

    clearSearchButton.hidden = true;
    cancelPendingSearch();
    run();
    scheduleRefresh();
  });
}

// Поиск при вводе: запускается через небольшую паузу после
// последнего символа. Кнопка «Найти» и Enter по-прежнему работают
// и запускают поиск сразу.
let searchTimer = null;
let isComposing = false;

function cancelPendingSearch() {
  clearTimeout(searchTimer);
  searchTimer = null;
}

function runLiveSearch() {
  searchTimer = null;

  if (!searchInput) return;

  // Запрос не изменился — повторно не ищем.
  if (searchInput.value.trim() === activeQuery) return;

  run();
  scheduleRefresh();
}

if (searchInput) {
  // Не мешаем вводу через IME (китайский, японский и т.п.):
  // ждём, пока пользователь закончит составлять символ.
  searchInput.addEventListener("compositionstart", () => {
    isComposing = true;
  });

  searchInput.addEventListener("compositionend", () => {
    isComposing = false;
    cancelPendingSearch();
    searchTimer = setTimeout(runLiveSearch, SEARCH_DEBOUNCE_MS);
  });

  searchInput.addEventListener("input", () => {
    // Кнопка очистки видна только при введённом тексте.
    if (clearSearchButton) {
      clearSearchButton.hidden =
        searchInput.value.trim().length === 0;
    }

    if (isComposing) return;

    cancelPendingSearch();
    searchTimer = setTimeout(runLiveSearch, SEARCH_DEBOUNCE_MS);
  });
}

// Escape закрывает раскрытую карточку.
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    collapseExpanded();
  }
});

// ======================================================
// ЗАПУСК
// ======================================================

run();
scheduleRefresh();