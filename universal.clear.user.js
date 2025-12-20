// ==UserScript==
// @name         🔥 gw_jshooker
// @namespace    https://github.com/haiw2sm
// @version      0.1.0
// @author       gdewai
// @match        *://*/*
// @exclude      *://github.com/*
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// run-at        document-body
// @supportURL   https://github.com/haiw2sm/gw_userscripts
// @homepageURL  https://github.com/haiw2sm/gw_userscripts
// @downloadURL  https://raw.githubusercontent.com/haiw2sm/gw_userscripts/main/universal.clear.user.js
// @updateURL    https://raw.githubusercontent.com/haiw2sm/gw_userscripts/main/universal.clear.user.js
// ==/UserScript==

(async function () {
  "use strict";
  const STORAGE_KEY = "gw_clear_data_switcher";

  var CONFIG = {
    cache: true,
    cookies: true,
    indexeddb: true,
    localstorage: true,
    sessionstorage: true,
  };

  class gw_js_hook_toolbox {
    constructor() {
      // Added: Retrieve the top-level window and document objects to avoid iframe nesting issues

      this.topWindow = window.top || window;
      this.topDocument = this.topWindow.document;
      // Added: Security check - Initialize the UI only in the top-level window to avoid creating it multiple times in iframes

      if (window !== this.topWindow) return;
      this.initUI();
      this.loadSettings();
    }
    async initUI() {
      // CSS for UI

      GM_addStyle(`
        #clear-data-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            border-radius: 8px;
            padding: 20px;
            z-index: 999999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            min-width: 350px;
            font-family: Arial, sans-serif;
            display: none;
            color: #fff;
            font-family: Monaco, PingFang, sans-serif;
        }
        #clear-data-panel h3 {
            margin-top: 0;
            color: inherit;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        #clear-data-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.7);
            z-index: 999998;
            display: none;
            backdrop-filter: blur(2px);
        }
        .data-option {
            margin: 20px 0 !important; /* 增加选项上下间距 */
            display: flex;
            align-items: center;
        }
        .data-option input {
            margin-right: 12px; /* 增加输入框和标签间距 */
            /* 强制重置input样式 */
            appearance: auto;
            -webkit-appearance: auto;
            background: #252526;
            border: 1px solid #444;
        }

        .data-option input[type="checkbox"]
        .data-option input[type="radio"] {
            width: 18px; /* 增大复选框/单选框 */
            height: 18px; 
        }

        .data-option label {
            font-size: 14px;
            cursor: pointer;
            flex-grow: 1;
        }
        .scope-option {
            padding: 15px;
            background: rgba(88,88,88,0.3);
            border-radius: 5px;
        }
        .buttons {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            gap: 10px;
        }
        .buttons button {
            flex: 1;
            padding: 6px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            font-size: inherit;
            transition: all 0.2s;
        }
        #clear-data-btn {
            background: #4CAF50;
            color: white;
        }
        #clear-data-btn:hover {
            background: #45a049;
        }
        #clear-data-btn:disabled {
            background: #cccccc;
            cursor: not-allowed;
        }
        #cancel-btn {
            background: #f44336;
            color: white;
        }
        #cancel-btn:hover {
            background: #d32f2f;
        }
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 1000000;
            display: none;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        }
        .notification.error {
            background: #f44336;
        }
        .clear-summary {
            margin-top: 15px;
            padding: 10px;
            background: #e8f5e8;
            border-radius: 4px;
            font-size: 13px;
            display: none;
        }
      `);
      // Create UI elements

      const overlay = document.createElement("div");
      overlay.id = "clear-data-overlay";
      document.body.appendChild(overlay);

      const panel = document.createElement("div");
      panel.id = "clear-data-panel";
      panel.innerHTML = `
        <h3>🗑️ Clear Browser Data</h3>
        <div class="data-option">
            <input type="checkbox" id="cache">
            <label for="cache">Cache (Browser Cache)</label>
        </div>
        <div class="data-option">
            <input type="checkbox" id="cookies">
            <label for="cookies">Cookies</label>
        </div>
        <div class="data-option">
            <input type="checkbox" id="indexeddb">
            <label for="indexeddb">IndexedDB</label>
        </div>
        <div class="data-option">
            <input type="checkbox" id="localstorage">
            <label for="localstorage">Local Storage</label>
        </div>
        <div class="data-option">
            <input type="checkbox" id="sessionstorage">
            <label for="sessionstorage">Session Storage</label>
        </div>
        <div class="scope-option">
            <strong>Clear Scope:</strong>
            <div class="data-option">
                <input type="radio" id="current-domain" name="scope" value="current" checked>
                <label for="current-domain">Current domain only (${window.location.hostname})</label>
            </div>
            <div class="data-option">
                <input type="radio" id="all-domains" name="scope" value="all">
                <label for="all-domains">All domains (requires page refresh)</label>
            </div>
        </div>
        <div class="clear-summary" id="clear-summary"></div>
        <div class="buttons">
            <button id="cancel-btn">Cancel</button>
            <button id="clear-data-btn">Clear</button>
        </div>
      `;
      document.body.appendChild(panel);

      const notification = document.createElement("div");
      notification.className = "notification";
      document.body.appendChild(notification);

      // Menu command

      GM_registerMenuCommand("🧹 Clear Browser Data", showPanel);

      // Functions

      function showPanel() {
        panel.style.display = "block";
        overlay.style.display = "block";
      }

      function hidePanel() {
        panel.style.display = "none";
        overlay.style.display = "none";
        document.getElementById("clear-summary").style.display = "none";
      }

      function showNotification(message, isError = false) {
        notification.textContent = message;
        notification.className = isError ? "notification error" : "notification";
        notification.style.display = "block";
        setTimeout(() => {
          notification.style.display = "none";
        }, 3000);
      }

      async function clearCurrentDomainData(options) {
        const summary = [];

        try {
          // Clear cookies for current domain

          if (options.cookies) {
            const domain = window.location.hostname;
            const path = window.location.pathname;
            const cookies = document.cookie.split(";");
            cookies.forEach((cookie) => {
              const eqPos = cookie.indexOf("=");
              const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${domain}; path=/`;
            });
            summary.push("Cookies cleared");
          }

          // Clear IndexedDB

          if (options.indexeddb && window.indexedDB) {
            const databases = indexedDB.databases ? await indexedDB.databases() : [];
            for (const db of databases) {
              try {
                indexedDB.deleteDatabase(db.name);
              } catch (e) {
                console.warn(`Failed to delete IndexedDB: ${db.name}`, e);
              }
            }
            summary.push("IndexedDB cleared");
          }

          // Clear Local Storage

          if (options.localstorage && window.localStorage) {
            const items = Object.keys(localStorage);
            localStorage.clear();
            summary.push(`LocalStorage cleared (${items.length} items)`);
          }

          // Clear Session Storage

          if (options.sessionstorage && window.sessionStorage) {
            const items = Object.keys(sessionStorage);
            sessionStorage.clear();
            summary.push(`SessionStorage cleared (${items.length} items)`);
          }

          // Clear cache using the Cache API (Service Worker cache)

          if (options.cache && "caches" in window) {
            try {
              const cacheNames = await caches.keys();
              await Promise.all(cacheNames.map((name) => caches.delete(name)));
              summary.push("Cache API cleared");
            } catch (e) {
              console.warn("Failed to clear Cache API:", e);
            }
          }

          // Force cache bypass on current page

          if (options.cache) {
            // Add timestamp to break cache

            if (window.location.href.indexOf("?") === -1) {
              window.location.href = window.location.href + "?t=" + Date.now();
            } else {
              window.location.href = window.location.href + "&t=" + Date.now();
            }
          }

          return summary;
        } catch (error) {
          console.error("Error clearing data:", error);
          throw error;
        }
      }

      function clearAllDomainsData(options) {
        showNotification("⚠️ To clear all domains, please use browser settings or refresh page after clearing current domain data", true);

        const summary = ["For all domains clearing, please:"];
        summary.push("1. Use Ctrl+Shift+Delete (Windows/Linux) or Cmd+Shift+Delete (Mac)");
        summary.push('2. Select "All time" and check desired options');
        summary.push('3. Or install a browser extension with "browsingData" permission');

        document.getElementById("clear-summary").innerHTML = summary.join("<br>");
        document.getElementById("clear-summary").style.display = "block";

        return summary;
      }

      var that = this;

      // Event Listeners

      document.getElementById("clear-data-btn").addEventListener("click", async function () {
        const btn = this;
        const originalText = btn.textContent;

        // Get selected options

        const options = {
          cache: document.getElementById("cache").checked,
          cookies: document.getElementById("cookies").checked,
          indexeddb: document.getElementById("indexeddb").checked,
          localstorage: document.getElementById("localstorage").checked,
          sessionstorage: document.getElementById("sessionstorage").checked,
        };

        // Check that at least one option is selected

        if (!Object.values(options).some((v) => v)) {
          showNotification("Please select at least one data type to clear", true);
          return;
        }

        // Save options

        CONFIG = Object.assign(CONFIG, options);
        that.saveSettings();

        // Obtain scope

        const scope = document.querySelector('input[name="scope"]:checked').value;

        // Disable the button and show loading

        btn.disabled = true;
        btn.textContent = "Clearing...";

        try {
          let summary;
          if (scope === "current") {
            summary = await clearCurrentDomainData(options);
          } else {
            summary = clearAllDomainsData(options);
          }

          if (scope === "current") {
            showNotification("✅ Data cleared successfully! Page will refresh...");
            setTimeout(() => {
              hidePanel();
            }, 1500);
          }

          if (summary && scope === "all") {
            // For all domains, we show a summary but don't refresh.

            btn.textContent = originalText;
            btn.disabled = false;
          }
        } catch (error) {
          showNotification("❌ Error clearing data: " + error.message, true);
          btn.textContent = originalText;
          btn.disabled = false;
        }
      });

      document.getElementById("cancel-btn").addEventListener("click", hidePanel);
      overlay.addEventListener("click", hidePanel);

      // Keyboard shortcut (Ctrl + Shift + Del)

      document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === "Delete") {
          e.preventDefault();
          showPanel();
        }
      });

      // Quick clear button in the corner (optional)

      const quickBtn = document.createElement("button");
      quickBtn.innerHTML = "🧹";
      quickBtn.style.cssText = `
        position: fixed;
        bottom: 6rem;
        right: 6rem;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: #4CAF50;
        color: white;
        border: none;
        font-size: 24px;
        cursor: pointer;
        z-index: 99999;
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        transition: transform 0.2s;
      `;
      quickBtn.addEventListener("mouseover", () => {
        quickBtn.style.transform = "scale(1.1)";
      });
      quickBtn.addEventListener("mouseout", () => {
        quickBtn.style.transform = "scale(1)";
      });
      quickBtn.addEventListener("click", showPanel);
      document.body.appendChild(quickBtn);

      console.log("Clear Browser Data script loaded. Use Ctrl+Shift+Del or click the 🧹 button.");
    }

    // Load settings from GM

    loadSettings() {
      // Load from GM storage

      if (typeof GM_getValue !== "undefined") {
        const savedSettings = GM_getValue(STORAGE_KEY);
        if (savedSettings) {
          CONFIG = savedSettings;
        } else {
          this.saveSettings();
        }
      }

      this.updateStyle();
    }

    // Save settings to GM

    saveSettings() {
      // Save to GM storage

      if (typeof GM_setValue !== "undefined") {
        GM_setValue(STORAGE_KEY, CONFIG);
      }
    }

    updateStyle() {
      Object.keys(CONFIG).forEach((key) => {
        var check = document.getElementById(`#${key}`);
        check.checked = CONFIG[key];
      });
    }
  }

  new gw_js_hook_toolbox();
})();
