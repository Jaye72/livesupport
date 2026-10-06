const $ = (id) => document.getElementById(id);
const pageArea = $("pageArea");
const cards = new Map();

// ---------------------------------------------------------------
// HARDCODED RELAY ADDRESS — user never sees or types this.
// Change this one line whenever your ngrok domain / VPS URL changes.
// ---------------------------------------------------------------
const RELAY_URL = "wss://crusader-sandworm-approval.ngrok-free.dev";

let maxPages = parseInt(localStorage.getItem("maxPages") || "3", 10);
if (!Number.isFinite(maxPages) || maxPages < 1) maxPages = 3;
$("showCount").value = maxPages;

function setMaxPages(v) {
  if (!Number.isFinite(v) || v < 1) v = 1;
  if (v > 50) v = 50;
  maxPages = v;
  $("showCount").value = v;
  localStorage.setItem("maxPages", String(v));
  trimPages();
}

$("showCount").addEventListener("change", () => setMaxPages(parseInt($("showCount").value, 10)));
$("showMinus").addEventListener("click", () => setMaxPages(maxPages - 1));
$("showPlus").addEventListener("click", () => setMaxPages(maxPages + 1));

// ---- canvas (page) width — live-adjustable, auto-resizes every page ----
// Width is a percentage of the screen, so the page follows the window size on
// both left and right (100 = fills the screen, minus a small side margin).
let pageWidth = parseInt(localStorage.getItem("pageWidthPct") || "100", 10);
if (!Number.isFinite(pageWidth) || pageWidth < 40 || pageWidth > 100) pageWidth = 100;
applyPageWidth(pageWidth);
$("widthRange").value = pageWidth;
$("widthVal").textContent = `${pageWidth}%`;

$("widthRange").addEventListener("input", () => {
  pageWidth = parseInt($("widthRange").value, 10);
  applyPageWidth(pageWidth);
  $("widthVal").textContent = `${pageWidth}%`;
  localStorage.setItem("pageWidthPct", String(pageWidth));
});

function applyPageWidth(pct) {
  // CSS var drives .page's max-width, so every card (current + future) resizes together
  document.documentElement.style.setProperty("--page-width", `${pct}%`);
}

// ---- reply text size — live-adjustable, applies to every card ----
let fontSize = parseInt(localStorage.getItem("fontSizePx") || "15", 10);
if (!Number.isFinite(fontSize) || fontSize < 12 || fontSize > 22) fontSize = 15;
applyFontSize(fontSize);
$("fontRange").value = fontSize;
$("fontVal").textContent = `${fontSize}px`;

$("fontRange").addEventListener("input", () => {
  fontSize = parseInt($("fontRange").value, 10);
  applyFontSize(fontSize);
  $("fontVal").textContent = `${fontSize}px`;
  localStorage.setItem("fontSizePx", String(fontSize));
});

function applyFontSize(px) {
  document.documentElement.style.setProperty("--body-font-size", `${px}px`);
}

// ---- top bar: auto-hides 5s after a successful connection; a small tab
// (fixed, stays put even once the bar is translated off-screen) toggles it ----
const chromeEl = document.querySelector(".chrome");
const chromeTab = $("chromeTab");
let autoHideTimer = null;

// max-height drives the collapse (so pageArea reclaims the space, not just a
// visual slide), so it must match the bar's real height, not an arbitrary cap
chromeEl.style.setProperty("--chrome-h", `${chromeEl.scrollHeight}px`);

function setChromeHidden(hidden) {
  chromeEl.classList.toggle("hidden", hidden);
}

chromeTab.addEventListener("click", () => {
  clearTimeout(autoHideTimer);
  setChromeHidden(!chromeEl.classList.contains("hidden"));
});

let ws = null;
let backoff = 1000;

// ---- settings panel (pairing code + display settings) ----
const backdrop = $("modalBackdrop");
const openModal = () => { $("err").textContent = ""; backdrop.classList.add("open"); $("room").focus(); };
const closeModal = () => backdrop.classList.remove("open");

$("settingsToggle").addEventListener("click", openModal);
$("cancelCfg").addEventListener("click", () => {
  if (localStorage.getItem("room")) closeModal(); // only allow close if already paired once
});

const savedRoom = localStorage.getItem("room");
if (savedRoom) $("room").value = savedRoom;
else openModal(); // first run: force pairing code entry

$("connect").addEventListener("click", () => {
  const room = $("room").value.trim().toUpperCase();
  if (room.length < 4) {
    $("err").textContent = "Enter at least 4 characters.";
    return;
  }
  localStorage.setItem("room", room);
  closeModal();
  if (ws) ws.close();
  backoff = 1000;
  connect();
});

$("room").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("connect").click();
});

$("clear").addEventListener("click", () => {
  cards.clear();
  pageArea.innerHTML = '<div class="empty" id="empty"><b>Cleared</b>New replies will appear here.</div>';
});

function connect() {
  const room = localStorage.getItem("room");
  if (!room) return;

  ws = new WebSocket(RELAY_URL);

  ws.onopen = () => {
    backoff = 1000;
    setLive(true);
    ws.send(JSON.stringify({ type: "hello", role: "viewer", room, name: "Live Session" }));
  };

  ws.onmessage = (e) => {
    let m;
    try { m = JSON.parse(e.data); } catch { return; }
    if (m.type === "delta" || m.type === "final") render(m);
    if (m.type === "peers") $("peers").textContent = `${m.count} connected`;
    if (m.type === "clear") $("clear").click();
  };

  ws.onclose = () => {
    setLive(false);
    setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 15000);
  };
  ws.onerror = () => ws.close();
}

function setLive(on) {
  $("dot").classList.toggle("live", on);
  $("statusText").textContent = on ? "Connected \u00b7 syncing live" : "Reconnecting\u2026";
  if (!on) $("peers").textContent = "";

  clearTimeout(autoHideTimer);
  if (on) {
    autoHideTimer = setTimeout(() => setChromeHidden(true), 5000);
  } else {
    setChromeHidden(false); // surface the bar again so reconnect status is visible
  }
}

// send a manual edit back through the relay so every connected device stays in sync
function sendEdit(id, text) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: "edit", id, text }));
  }
}

// recent-first: oldest page (bottom of list) gets removed
function trimPages() {
  while (cards.size > maxPages) {
    const ids = [...cards.keys()];
    const oldestId = ids[ids.length - 1];
    cards.get(oldestId)?.el?.remove();
    cards.delete(oldestId);
  }
}

// Keep at most one blank line between paragraphs and drop trailing spaces.
// \r\n / \r are normalised first, otherwise a Windows-side sender's line
// breaks survive as stray characters and the whole reply reads as one block.
function tighten(t) {
  return String(t || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---- light markdown: paragraphs, bullets, numbered lists, **bold**, `code` ----
// Built with createElement/textContent only (never innerHTML), so a reply can
// never inject markup into the page.
function addInline(parent, str) {
  const parts = str.split(/(\*\*[^*]+?\*\*|__[^_]+?__|`[^`]+?`)/);
  for (const part of parts) {
    if (!part) continue;
    let node;
    if (/^\*\*[^*]+\*\*$/.test(part) || /^__[^_]+__$/.test(part)) {
      node = document.createElement("strong");
      node.textContent = part.slice(2, -2);
    } else if (/^`[^`]+`$/.test(part)) {
      node = document.createElement("code");
      node.textContent = part.slice(1, -1);
    } else {
      node = document.createTextNode(part);
    }
    parent.appendChild(node);
  }
}

function renderRich(container, text) {
  const frag = document.createDocumentFragment();
  let para = null;
  let list = null;
  let listType = null;
  let pre = null;
  const closeText = () => { para = null; list = null; listType = null; };

  for (const rawLine of text.replace(/\t/g, "  ").split("\n")) {
    if (/^\s*```/.test(rawLine)) {
      if (pre) { pre = null; } else {
        closeText();
        pre = document.createElement("pre");
        frag.appendChild(pre);
      }
      continue;
    }
    if (pre) {
      pre.textContent += (pre.textContent ? "\n" : "") + rawLine;
      continue;
    }

    if (!rawLine.trim()) { closeText(); continue; }

    let m = rawLine.match(/^\s{0,3}#{1,6}\s+(.*)$/);
    if (m) {
      closeText();
      const h = document.createElement("div");
      h.className = "h";
      addInline(h, m[1]);
      frag.appendChild(h);
      continue;
    }

    m = rawLine.match(/^(\s*)([-*\u2022\u00b7])\s+(.*)$/);
    const n = m ? null : rawLine.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
    if (m || n) {
      const type = m ? "ul" : "ol";
      const g = m || n;
      if (!list || listType !== type) {
        list = document.createElement(type);
        if (n) list.start = parseInt(n[2], 10);
        listType = type;
        para = null;
        frag.appendChild(list);
      }
      const li = document.createElement("li");
      const level = Math.min(3, Math.floor(g[1].length / 2));
      if (level) li.style.marginLeft = level * 16 + "px";
      addInline(li, g[3]);
      list.appendChild(li);
      continue;
    }

    list = null; listType = null;
    const lineText = rawLine.trim();

    // A blank line is what marks a paragraph change (closeText() above), so
    // that is the only place the --para-gap spacing appears. Lines separated
    // by a single newline stay inside the same <p>, joined with a line break.
    if (!para) {
      para = document.createElement("p");
      frag.appendChild(para);
    } else {
      para.appendChild(document.createElement("br"));
    }
    addInline(para, lineText);
  }
  container.replaceChildren(frag);
}

function render(m) {
  $("empty")?.remove();

  // newest reply is always prepended on top; jump the viewport up to it so
  // an incoming response is never missed while scrolled down reading older ones
  if (!document.activeElement?.classList?.contains("page-body")) {
    pageArea.scrollTop = 0;
  }

  let entry = cards.get(m.id);
  if (!entry) {
    const el = document.createElement("article");
    el.className = "page";
    el.innerHTML = `
      <div class="page-head">
        <span class="page-time">${new Date(m.at).toLocaleTimeString()}</span>
        <button class="page-copy">Copy</button>
      </div>
      ${m.prompt ? `<div class="page-prompt"></div>` : ""}
      <div class="page-body"></div>`;
    pageArea.prepend(el); // newest page on top

    const body = el.querySelector(".page-body");
    if (m.prompt) el.querySelector(".page-prompt").textContent = m.prompt;
    el.querySelector(".page-copy").addEventListener("click", async (ev) => {
      try { await navigator.clipboard.writeText(entry.dirty ? body.innerText : (entry.raw || body.innerText)); } catch {}
      ev.target.textContent = "Copied";
      setTimeout(() => (ev.target.textContent = "Copy"), 1400);
    });

    // ---- notepad-style inline editing, synced live as you type ----
    // Once a reply is final, .page-body becomes contenteditable — click
    // anywhere in it and type/select/delete like a normal text field.
    // Every keystroke is pushed to the relay (via a tiny debounce, just to
    // coalesce same-frame keystrokes) so other devices update character by
    // character, not on blur/Enter.
    let lastSynced = "";
    let saveTimer = null;

    function flushSave() {
      clearTimeout(saveTimer);
      saveTimer = null;
      const text = body.innerText;
      if (text !== lastSynced) {
        sendEdit(m.id, text);
        lastSynced = text;
      }
    }

    body.addEventListener("input", () => {
      if (entry) entry.dirty = true;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(flushSave, 60);
    });
    body.addEventListener("blur", flushSave);

    entry = {
      el,
      body,
      setSynced: (t) => { lastSynced = t; }
    };
    const rebuilt = new Map([[m.id, entry], ...cards]);
    cards.clear();
    for (const [k, v] of rebuilt) cards.set(k, v);
    trimPages();
  }

  // don't clobber text the user is actively typing into on this device
  const isFocused = document.activeElement === entry.body;
  if (!isFocused) {
    const clean = tighten(m.text || "");
    if (entry.raw !== clean) {
      entry.raw = clean;
      entry.dirty = false;
      renderRich(entry.body, clean);
    }
    if (m.type === "final" && !entry.dirty) entry.setSynced(entry.body.innerText);
  }

  entry.el.querySelector(".cursor")?.remove();
  if (m.type === "final") {
    if (entry.body.contentEditable !== "true") entry.body.contentEditable = "true";
  } else if (!isFocused) {
    const cur = document.createElement("span");
    cur.className = "cursor";
    // keep the cursor on the last line, inside the last paragraph / list item
    let host = entry.body.lastElementChild;
    if (host && (host.tagName === "UL" || host.tagName === "OL")) host = host.lastElementChild;
    (host && host.tagName !== "PRE" ? host : entry.body).appendChild(cur);
  }
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && ws?.readyState !== 1 && localStorage.getItem("room")) connect();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

if (savedRoom) connect();
