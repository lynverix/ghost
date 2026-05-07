const { Controller } = $scramjetController;
import { BareCompatibleClient } from "@mercuryworkshop/proxy-transports";

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
let controller = null;

// load feature flags from localstorage, fall back to empty
function loadFlags() {
  try {
    const stored = localStorage.getItem("scramjet-flags");
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

async function init() {
  // register the controller service worker
  const reg = await navigator.serviceWorker.register("/controller/controller.sw.js", {
    type: "module",
  });

  // wait for an active service worker
  const readyReg = await navigator.serviceWorker.ready;
  const sw = readyReg.active;

  // set up transport pointing at our wisp server
  const transport = new BareCompatibleClient(
    "wss://" + location.host + "/wisp/"
  );

  // create the controller
  controller = new Controller({
    config: {
      prefix: "/~/sj/",
      scramjetPath: "/scramjet/scramjet.js",
      injectPath: "/controller/controller.inject.js",
      wasmPath: "/scramjet/scramjet.wasm",
    },
    scramjetConfig: {
      flags: loadFlags(),
    },
    serviceworker: sw,
    transport,
  });

  await controller.wait();

  createTab();
}

// create a new tab
function createTab(url) {
  const id = ++tabCounter;

  const iframe = document.createElement("iframe");
  iframe.className = "proxy-frame";
  iframe.style.display = "none";
  frameContainer.appendChild(iframe);

  // register this iframe as a scramjet frame
  const frame = controller.createFrame(iframe);

  const tab = { id, iframe, frame, url: url || "", title: "" };
  tabs.push(tab);

  renderTabs();
  switchTab(id);

  if (url) navigate(url);
}

// switch to a tab by id
function switchTab(id) {
  tabs.forEach(t => {
    t.iframe.style.display = t.id === id ? "block" : "none";
  });

  activeTabId = id;

  const tab = getActiveTab();
  omnibox.value = tab ? tab.url : "";

  renderTabs();
}

// close a tab
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

// get the active tab
function getActiveTab() {
  return tabs.find(t => t.id === activeTabId) || null;
}

// re-render tab strip
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

// navigate the active tab
function navigate(input) {
  const tab = getActiveTab();
  if (!tab) return;

  const url = resolveInput(input);
  tab.url = url;
  omnibox.value = url;

  // encode and load via the frame's prefix
  tab.iframe.src = tab.frame.prefix + controller.config.codec.encode(url);

  renderTabs();
}

// resolve raw input to a full url
function resolveInput(input) {
  input = input.trim();
  if (/^https?:\/\//i.test(input)) return input;
  if (/^[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(input)) return "https://" + input;
  return "https://www.google.com/search?q=" + encodeURIComponent(input);
}

// sync tab title from iframe
function syncTabTitle(tab) {
  try {
    const title = tab.iframe.contentDocument?.title;
    if (title) {
      tab.title = title;
      renderTabs();
    }
  } catch {
    // cross-origin, fine to ignore
  }
}

// omnibox events
omnibox.addEventListener("keydown", (e) => {
  if (e.key === "Enter") navigate(omnibox.value);
});

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

// update omnibox on iframe navigation
frameContainer.addEventListener("load", (e) => {
  if (!e.target.classList.contains("proxy-frame")) return;

  const tab = tabs.find(t => t.iframe === e.target);
  if (!tab || tab.id !== activeTabId) return;

  try {
    const raw = tab.iframe.contentWindow?.location.pathname;
    if (raw && tab.frame?.prefix && raw.startsWith(tab.frame.prefix)) {
      const encoded = raw.slice(tab.frame.prefix.length);
      tab.url = controller.config.codec.decode(encoded);
      omnibox.value = tab.url;
    }
  } catch {
    // cross-origin, ignore
  }

  syncTabTitle(tab);
}, true);

init();