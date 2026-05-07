import { ScramjetController } from "@mercuryworkshop/scramjet";
import { BareMuxConnection } from "@mercuryworkshop/bare-mux";
import "/libcurl/index.js";

// dom references
const tabsEl = document.getElementById("tabs");
const frameContainer = document.getElementById("frame-container");
const omnibox = document.getElementById("omnibox");
const backBtn = document.getElementById("back-btn");
const forwardBtn = document.getElementById("forward-btn");
const refreshBtn = document.getElementById("refresh-btn");
const newTabBtn = document.getElementById("new-tab-btn");

// tab state
const tabs = [];
let activeTabId = null;
let tabCounter = 0;

// scramjet controller instance
const controller = new ScramjetController({
  prefix: "/scram/",
  files: {
    wasm: "/scram/scramjet.wasm.js",
    worker: "/scram/scramjet.worker.js",
    client: "/scram/scramjet.client.js",
    shared: "/scram/scramjet.shared.js",
    sync: "/scram/scramjet.sync.js",
  },
  flags: loadFlags(),
});

// load feature flags from localstorage, fall back to defaults
function loadFlags() {
  try {
    const stored = localStorage.getItem("scramjet-flags");
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// register service worker and set up bare-mux transport
async function init() {
  await controller.init("/sw.js");

  const conn = new BareMuxConnection("/baremux/worker.js");
  await conn.setTransport("/libcurl/index.js", [
    "wss://" + location.host + "/wisp/",
  ]);

  createTab();
}

// create a new tab, optionally with a starting url
function createTab(url) {
  const id = ++tabCounter;

  const iframe = document.createElement("iframe");
  iframe.id = "frame-" + id;
  iframe.className = "proxy-frame";
  iframe.style.display = "none";
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups");
  frameContainer.appendChild(iframe);

  const tab = { id, iframe, url: url || "" };
  tabs.push(tab);

  renderTabs();
  switchTab(id);

  if (url) navigate(url);
}

// switch active tab
function switchTab(id) {
  tabs.forEach(t => {
    t.iframe.style.display = t.id === id ? "block" : "none";
  });

  activeTabId = id;

  const tab = getActiveTab();
  omnibox.value = tab ? tab.url : "";

  renderTabs();
}

// close a tab, always keep at least one open
function closeTab(id) {
  const index = tabs.findIndex(t => t.id === id);
  if (index === -1) return;

  tabs[index].iframe.remove();
  tabs.splice(index, 1);

  if (tabs.length === 0) {
    createTab();
    return;
  }

  const next = tabs[Math.min(index, tabs.length - 1)];
  switchTab(next.id);

  renderTabs();
}

// get the currently active tab object
function getActiveTab() {
  return tabs.find(t => t.id === activeTabId) || null;
}

// re-render all tab buttons
function renderTabs() {
  tabsEl.innerHTML = "";

  tabs.forEach(tab => {
    const el = document.createElement("div");
    el.className = "tab" + (tab.id === activeTabId ? " active" : "");

    const label = document.createElement("span");
    label.className = "tab-label";
    label.textContent = tab.title || tab.url || "new tab";
    label.addEventListener("click", () => switchTab(tab.id));

    const closeBtn = document.createElement("button");
    closeBtn.className = "tab-close";
    closeBtn.textContent = "x";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });

    el.appendChild(label);
    el.appendChild(closeBtn);
    tabsEl.appendChild(el);
  });
}

// navigate the active tab to a url or search query
function navigate(input) {
  const tab = getActiveTab();
  if (!tab) return;

  const url = resolveInput(input);
  tab.url = url;
  omnibox.value = url;

  tab.iframe.src = controller.encodeUrl(url);

  renderTabs();
}

// try to update the tab title from the iframe document
function syncTabTitle(tab) {
  try {
    const title = tab.iframe.contentDocument?.title;
    if (title) {
      tab.title = title;
      renderTabs();
    }
  } catch {
    // cross-origin, can't read title — that's fine
  }
}

// turn raw input into a full url
function resolveInput(input) {
  input = input.trim();

  if (/^https?:\/\//i.test(input)) return input;

  // looks like a domain
  if (/^[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(input)) return "https://" + input;

  // treat as a search
  return "https://www.google.com/search?q=" + encodeURIComponent(input);
}

// omnibox: navigate on enter
omnibox.addEventListener("keydown", (e) => {
  if (e.key === "Enter") navigate(omnibox.value);
});

// omnibox: select all on focus
omnibox.addEventListener("focus", () => omnibox.select());

// nav buttons
backBtn.addEventListener("click", () => {
  const tab = getActiveTab();
  if (tab) tab.iframe.contentWindow?.history.back();
});

forwardBtn.addEventListener("click", () => {
  const tab = getActiveTab();
  if (tab) tab.iframe.contentWindow?.history.forward();
});

refreshBtn.addEventListener("click", () => {
  const tab = getActiveTab();
  if (tab) tab.iframe.contentWindow?.location.reload();
});

newTabBtn.addEventListener("click", () => createTab());

// update omnibox and title when the iframe navigates
frameContainer.addEventListener("load", (e) => {
  if (!e.target.classList.contains("proxy-frame")) return;

  const tab = tabs.find(t => t.iframe === e.target);
  if (!tab || tab.id !== activeTabId) return;

  try {
    const raw = tab.iframe.contentWindow?.location.href;
    if (raw) {
      tab.url = controller.decodeUrl(raw);
      omnibox.value = tab.url;
    }
  } catch {
    // cross-origin block — ignore
  } 

  syncTabTitle(tab);
}, true);

init();