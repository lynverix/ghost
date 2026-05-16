"use strict";

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
  files: {
    wasm: "/scram/scramjet.wasm.wasm",
    all: "/scram/scramjet.all.js",
    sync: "/scram/scramjet.sync.js",
  },
});

scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

// dom refs
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

// always force-set the transport before navigating
async function ensureTransport() {
  const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
  await connection.setTransport("/libcurl/index.mjs", [{ websocket: wispUrl }]);
}

// create a new tab, optionally navigate to a url
function createTab(url) {
  const id = ++tabCounter;

  const sjFrame = scramjet.createFrame();
  sjFrame.frame.className = "proxy-frame";
  sjFrame.frame.style.display = "none";
  frameContainer.appendChild(sjFrame.frame);

  const tab = { id, sjFrame, url: url || "", title: "new tab" };
  tabs.push(tab);

  renderTabs();
  switchTab(id);

  if (url) navigateTab(tab, url);
}

// navigate a tab to a url or search query
async function navigateTab(tab, input) {
  try {
    await ensureTransport();
  } catch (err) {
    console.error("transport setup failed:", err);
  }

  const url = search(input, "https://duckduckgo.com/?q=%s");
  tab.url = url;
  omnibox.value = url;

  // load gateway.html which self-navigates to the proxy url
  // this way the sw intercepts the navigation from within the iframe
  const proxyUrl = "/scramjet/" + encodeURIComponent(url);
  tab.sjFrame.frame.src = "/gateway.html?to=" + encodeURIComponent(proxyUrl);

  renderTabs();
}

// switch the active tab
function switchTab(id) {
  tabs.forEach(t => {
    t.sjFrame.frame.style.display = t.id === id ? "block" : "none";
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

  tabs[index].sjFrame.frame.remove();
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

// re-render the tab strip
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
    closeBtn.addEventListener("click", e => {
      e.stopPropagation();
      closeTab(tab.id);
    });

    el.appendChild(label);
    el.appendChild(closeBtn);
    tabsEl.appendChild(el);
  });
}

// try to sync the tab title from the iframe
function syncTitle(tab) {
  try {
    const title = tab.sjFrame.frame.contentDocument?.title;
    if (title) {
      tab.title = title;
      renderTabs();
    }
  } catch {
    // cross-origin, fine to skip
  }
}

// omnibox: navigate on enter
omnibox.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const tab = getActiveTab();
  if (tab) navigateTab(tab, omnibox.value);
});

// omnibox: select all on focus
omnibox.addEventListener("focus", () => omnibox.select());

// nav buttons
backBtn.addEventListener("click", () => {
  const tab = getActiveTab();
  if (tab) tab.sjFrame.frame.contentWindow?.history.back();
});

forwardBtn.addEventListener("click", () => {
  const tab = getActiveTab();
  if (tab) tab.sjFrame.frame.contentWindow?.history.forward();
});

refreshBtn.addEventListener("click", () => {
  const tab = getActiveTab();
  if (tab) tab.sjFrame.frame.contentWindow?.location.reload();
});

newTabBtn.addEventListener("click", () => createTab());

// sync title when the iframe finishes loading
frameContainer.addEventListener("load", e => {
  if (!e.target.classList.contains("proxy-frame")) return;
  const tab = tabs.find(t => t.sjFrame.frame === e.target);
  if (!tab) return;
  syncTitle(tab);
}, true);

// register sw, wait for it to be active and controlling, then open first tab
(async () => {
  try {
    await registerSW();
  } catch (err) {
    console.error("sw registration failed:", err);
  }

  await navigator.serviceWorker.ready;

  // wait for the sw to actually be controlling this page before creating tabs
  if (!navigator.serviceWorker.controller) {
    await new Promise(resolve => {
      navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
      setTimeout(resolve, 3000);
    });
  }

  createTab();
})();