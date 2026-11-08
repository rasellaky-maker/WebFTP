import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, serverTimestamp,
  query, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAef9tFj0KVWQRgSH2YzucJ0a_qRtkvjY",
  authDomain: "stockpilot-614c9.firebaseapp.com",
  projectId: "stockpilot-614c9",
  storageBucket: "stockpilot-614c9.firebasestorage.app",
  messagingSenderId: "1081450930218",
  appId: "1:1081450930218:web:79a418cef4fea963aca353",
  measurementId: "G-SL0BK2S0V4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const lang = document.documentElement.lang || "en";
const copy = {
  ru: {
    emptyTitle: "Здесь пока тихо", empty: "Стань первым, кто начнёт обсуждение.",
    loading: "Загружаем комментарии…", sent: "Комментарий опубликован!", sending: "Публикуем…",
    error: "Не удалось отправить комментарий. Попробуй ещё раз.",
    authError: "Не удалось подключиться. Обнови страницу и попробуй ещё раз.",
    loadError: "Не удалось загрузить комментарии.",
    alreadyPosted: "Ты уже оставил(а) комментарий. Чтобы написать новый, сначала удали свой.",
    del: "Удалить", deleting: "Удаляем…", you: "Ты",
    deleteConfirm: "Удалить твой комментарий?", deleteError: "Не удалось удалить комментарий. Попробуй ещё раз.",
    publish: "Опубликовать ↗", count: n => `${n} комментариев`
  },
  de: {
    emptyTitle: "Hier ist es noch ruhig", empty: "Starte als Erste(r) die Unterhaltung.",
    loading: "Kommentare werden geladen…", sent: "Kommentar veröffentlicht!", sending: "Wird veröffentlicht…",
    error: "Kommentar konnte nicht gesendet werden. Bitte erneut versuchen.",
    authError: "Verbindung fehlgeschlagen. Bitte Seite neu laden und erneut versuchen.",
    loadError: "Kommentare konnten nicht geladen werden.",
    alreadyPosted: "Du hast bereits einen Kommentar geschrieben. Lösche ihn zuerst, um einen neuen zu schreiben.",
    del: "Löschen", deleting: "Wird gelöscht…", you: "Du",
    deleteConfirm: "Deinen Kommentar löschen?", deleteError: "Kommentar konnte nicht gelöscht werden. Bitte erneut versuchen.",
    publish: "Kommentar veröffentlichen ↗", count: n => `${n} Kommentare`
  },
  en: {
    emptyTitle: "It’s quiet here so far", empty: "Be the first to start the conversation.",
    loading: "Loading comments…", sent: "Your comment has been published!", sending: "Publishing…",
    error: "Could not send your comment. Please try again.",
    authError: "Could not connect. Please reload the page and try again.",
    loadError: "Could not load comments.",
    alreadyPosted: "You have already left a comment. Delete it first if you want to write a new one.",
    del: "Delete", deleting: "Deleting…", you: "You",
    deleteConfirm: "Delete your comment?", deleteError: "Could not delete your comment. Please try again.",
    publish: "Publish comment ↗", count: n => `${n} comments`
  }
};
const t = copy[lang] || copy.en;

const form = document.getElementById("commentForm");
const nameInput = document.getElementById("commentName");
const messageInput = document.getElementById("commentMessage");
const submitButton = document.getElementById("commentSubmit");
const statusEl = document.getElementById("commentStatus");
const listEl = document.getElementById("commentsList");
const totalEl = document.getElementById("commentsTotal");

// Notice shown instead of the form when this visitor already has a comment.
const ownNote = document.createElement("p");
ownNote.className = "comment-own-note";
ownNote.textContent = t.alreadyPosted;
ownNote.hidden = true;
form.before(ownNote);

let currentUid = null;
let lastSnapshot = null;
let unsubscribeOwn = null;
let signingIn = false;

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "";
  const locale = lang === "ru" ? "ru-RU" : lang === "de" ? "de-AT" : "en-IE";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(timestamp.toDate());
}

function renderComments(snapshot) {
  totalEl.textContent = String(snapshot.size);
  listEl.className = "comments-list";
  listEl.replaceChildren();
  if (snapshot.empty) {
    const empty = document.createElement("div");
    empty.className = "comments-empty";
    const title = document.createElement("strong");
    title.textContent = t.emptyTitle;
    const desc = document.createElement("span");
    desc.textContent = t.empty;
    empty.append(title, desc);
    listEl.append(empty);
    return;
  }
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const isOwn = currentUid !== null && docSnap.id === currentUid && data.uid === currentUid;
    const card = document.createElement("article");
    card.className = "comment-card";
    const top = document.createElement("div");
    top.className = "comment-card-top";
    const author = document.createElement("div");
    author.className = "comment-author";
    const avatar = document.createElement("span");
    avatar.className = "comment-avatar";
    avatar.textContent = (data.name || "?").trim().charAt(0).toUpperCase();
    const name = document.createElement("span");
    name.textContent = data.name || "—";
    author.append(avatar, name);
    if (isOwn) {
      const you = document.createElement("span");
      you.className = "comment-you";
      you.textContent = t.you;
      author.append(you);
    }
    const meta = document.createElement("div");
    meta.className = "comment-meta";
    const date = document.createElement("time");
    date.className = "comment-date";
    date.textContent = formatDate(data.createdAt);
    meta.append(date);
    if (isOwn) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "comment-delete";
      del.textContent = t.del;
      del.addEventListener("click", async () => {
        if (!window.confirm(t.deleteConfirm)) return;
        del.disabled = true;
        del.textContent = t.deleting;
        try {
          await deleteDoc(doc(db, "comments", currentUid));
        } catch (error) {
          console.error("Firebase delete error:", error);
          window.alert(t.deleteError);
          del.disabled = false;
          del.textContent = t.del;
        }
      });
      meta.append(del);
    }
    top.append(author, meta);
    const message = document.createElement("p");
    message.className = "comment-text";
    // textContent prevents visitors from injecting HTML or scripts.
    message.textContent = data.message || "";
    card.append(top, message);
    listEl.append(card);
  });
}

function setHasOwnComment(hasOwn) {
  form.hidden = hasOwn;
  ownNote.hidden = !hasOwn;
}

function watchOwnComment() {
  if (unsubscribeOwn) unsubscribeOwn();
  unsubscribeOwn = onSnapshot(
    doc(db, "comments", currentUid),
    snap => setHasOwnComment(snap.exists()),
    error => console.error("Firebase own comment read error:", error)
  );
}

// Every visitor gets an anonymous account, so we can tell "my" comment from others.
onAuthStateChanged(auth, user => {
  if (user) {
    currentUid = user.uid;
    watchOwnComment();
    if (lastSnapshot) renderComments(lastSnapshot);
  } else if (!signingIn) {
    signingIn = true;
    signInAnonymously(auth)
      .catch(error => console.error("Firebase anonymous sign-in error:", error))
      .finally(() => { signingIn = false; });
  }
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const message = messageInput.value.trim();
  if (name.length < 2 || message.length < 2) return;
  statusEl.classList.remove("error");
  statusEl.textContent = "";
  if (!currentUid) {
    statusEl.textContent = t.authError;
    statusEl.classList.add("error");
    return;
  }
  submitButton.disabled = true;
  submitButton.textContent = t.sending;
  try {
    // The document id equals the user's id, so one visitor can only have one comment.
    await setDoc(doc(db, "comments", currentUid), {
      name, message, uid: currentUid, createdAt: serverTimestamp()
    });
    form.reset();
    statusEl.textContent = t.sent;
  } catch (error) {
    console.error("Firebase comment error:", error);
    statusEl.textContent = t.error;
    statusEl.classList.add("error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = t.publish;
  }
});

const commentsQuery = query(collection(db, "comments"), orderBy("createdAt", "desc"), limit(100));
onSnapshot(commentsQuery, snapshot => {
  lastSnapshot = snapshot;
  renderComments(snapshot);
}, error => {
  console.error("Firebase comments read error:", error);
  listEl.textContent = t.loadError;
  listEl.className = "comments-empty";
});
