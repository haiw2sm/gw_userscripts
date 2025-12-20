// ==UserScript==
// @name         DeepSeek Code Block Collapser (Simplified Version)
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  Adds collapse/expand functionality to code blocks in the DeepSeek chat interface
// @author       gdewai
// @match        https://chat.deepseek.com/*
// @match        https://www.deepseek.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=deepseek.com
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  // Configuration Options

  const CONFIG = {
    // Default collapse state: 'none' - do not collapse, 'all' - collapse all, 'long' - collapse only long code blocks

    defaultCollapse: "long",
    // Line count threshold for long code blocks (effective when defaultCollapse is set to 'long')

    longCodeLines: 15,
    // Whether to remember the folded state of each code block

    rememberState: true,
  };

  const UI = {
    svg: {
      fold: '<path d="M8 5L5 8H7V11H9V8H11L8 5Z" fill="currentColor"></path>',
      unfold: '<path d="M8 11L5 8H7V5H9V8H11L8 11Z" fill="currentColor"></path>',
    },
  };

  const generate_block_id = (type) => `${type}-` + Date.now() + "-" + Math.random().toString(36).substr(2, 9);

  // Add custom style

  GM_addStyle(`
        /* Style when folding code blocks */
        .md-code-block-banner-wrap.collapsed + div pre,
        .md-code-block-banner-wrap.collapsed + pre {
            display: none;
        }
        
        /* Code folding button style */
        .code-fold-btn {
            display: inline-flex;
            align-items: center;
            margin-right: 4px;
        }
        
        /* Fold button animation */
        .fold-indicator {
            display: inline-block;
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            transition: transform 0.2s ease;
            margin-right: 4px;
        }
        
        .fold-indicator.expanded {
            border-top: 6px solid currentColor;
        }
        
        .fold-indicator.collapsed {
            border-bottom: 6px solid currentColor;
        }
        
        /* Number of lines in the language tag */
        .language-with-lines::after {
            content: attr(data-lines);
            margin-left: 6px;
            opacity: 0.7;
            font-size: 0.9em;
        }
        
        /* Control Panel Style */
        .fold-control-panel {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            padding: 16px;
            z-index: 10000;
            min-width: 200px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            display: none;
            border: 1px solid #ddd;
        }
        
        .fold-control-panel.visible {
            display: block;
        }
        
        .fold-control-panel h3 {
            margin: 0 0 12px 0;
            font-size: 16px;
            color: #333;
        }
        
        .control-group {
            margin-bottom: 12px;
        }
        
        .control-group label {
            display: block;
            margin-bottom: 6px;
            color: #555;
        }
        
        .control-group select, .control-group input {
            width: 100%;
            padding: 6px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
        }
        
        .panel-actions {
            display: flex;
            justify-content: space-between;
            margin-top: 16px;
        }
        
        .panel-actions button {
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .panel-actions .apply-btn {
            background: #4CAF50;
            color: white;
        }
        
        .panel-actions .close-btn {
            background: #f1f1f1;
            color: #333;
        }
        
        /* Global control button */
        .global-fold-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            transition: all 0.3s ease;
        }
        
        .global-fold-btn:hover {
            background: #45a049;
            transform: scale(1.1);
        }
        
        /* 响应式调整 */
        @media (max-width: 768px) {
            .global-fold-btn {
                width: 40px;
                height: 40px;
                font-size: 16px;
                bottom: 15px;
                right: 15px;
            }
            
            .fold-control-panel {
                bottom: 80px;
                right: 15px;
                left: 15px;
                min-width: auto;
            }
        }
    `);

  // Initialization Script

  class CodeBlockFolder {
    constructor() {
      this.codeBlocks = new Map(); // Save code block state

      this.processedBlocks = new WeakSet(); // Processed code block

      this.msgs = new Map(); // Store all session states

      this.processedMsgs = new WeakSet(); // Processed Conversations

      this.init();
    }

    // Initialize

    init() {
      // Load saved configuration

      this.loadConfig();

      // Create a global control button

      this.createGlobalButton();

      // Create Control Panel

      this.createControlPanel();

      // Initial Processing Code Block

      this.processAllCodeBlocks();

      // Initial processing message bubble

      this.processAllMsgs();

      // Monitor page changes (for dynamically loaded content)

      this.setupMutationObserver();

      // Listen to keyboard shortcuts

      this.setupKeyboardShortcuts();

      console.log("DeepSeek代码块折叠器已加载");
    }

    // Load Configuration

    loadConfig() {
      const savedConfig = GM_getValue("foldConfig");
      if (savedConfig) {
        Object.assign(CONFIG, savedConfig);
      }
    }

    // Save Configuration

    saveConfig() {
      GM_setValue("foldConfig", CONFIG);
    }

    // Handle all code blocks

    processAllCodeBlocks() {
      // Find the header of the deep seek code block

      const codeBanners = document.querySelectorAll(".md-code-block-banner-wrap");

      codeBanners.forEach((banner) => {
        if (!this.processedBlocks.has(banner)) {
          this.processCodeBlock(banner);
        }
      });
    }

    processAllMsgs() {
      // const ses = document.querySelectorAll('.ds-message > .fbb737a4');

      const msgs = document.querySelectorAll("._9663006");

      msgs.forEach((msg) => {
        if (!this.processedMsgs.has(msg)) {
          this.processMsg(msg);
        }
      });
    }

    processMsg(msg) {
      const btn = msg.querySelector(".ds-icon-button");

      if (!btn) return;

      console.log(btn);

      const blockId = generate_block_id("msg");

      btn.parentNode.innerHTML += `
            <div class="${blockId} ds-icon-button ds-icon-button--m ds-icon-button--sizing-container" style="margin-left: 10px;" tabindex="0" role="button" aria-disabled="false">
                <div class="ds-icon-button__hover-bg"></div>
                <div class="ds-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        ${UI.svg.fold}
                    </svg>
                </div>
                <div class="ds-focus-ring"></div>
            </div>
            `;

      const gw_custom = btn.parentNode.querySelector(`.${blockId}`);

      this.msgs.set(blockId, {
        element: gw_custom,
        um_id: msg.dataset.umId,
        isCollapsed: gw.classList.contains("collapsed"),
      });

      gw_custom.addEventListener("click", () => {
        // This.toggleControlPanel();
      });
    }

    // Process a single code block

    processCodeBlock(banner) {
      // Get code block container

      const codeBlock = this.findCodeBlockElement(banner);
      if (!codeBlock) return;

      // Get the number of lines of code

      const codeText = codeBlock.textContent || "";
      const lineCount = codeText.split("\n").length;

      // Generate a unique ID

      const blockId = generate_block_id("code");
      banner.dataset.foldId = blockId;

      // Add a collapse button

      this.addFoldButton(banner);

      // Add line number information to the language tag

      this.addLineCountInfo(banner, lineCount);

      // Set initial collapse state

      this.setInitialFoldState(banner, lineCount, blockId);

      // Mark as processed

      this.processedBlocks.add(banner);

      // Save to map

      this.codeBlocks.set(blockId, {
        element: banner,
        codeBlock: codeBlock,
        lineCount,
        isCollapsed: banner.classList.contains("collapsed"),
      });
    }

    // Find code block element

    findCodeBlockElement(banner) {
      // Find the next adjacent sibling element

      let nextElement = banner.nextElementSibling;

      // Check if it is a pre element or a div containing a pre element

      while (nextElement) {
        if (nextElement.tagName === "PRE" || nextElement.querySelector("pre")) {
          return nextElement.tagName === "PRE" ? nextElement : nextElement.querySelector("pre");
        }
        nextElement = nextElement.nextElementSibling;
      }

      return null;
    }

    // Add a collapse button

    addFoldButton(banner) {
      // Search button container

      const buttonContainer = banner.querySelector(".efa13877");
      if (!buttonContainer) return;

      // Check if the collapse button already exists

      if (buttonContainer.querySelector(".code-fold-btn")) return;

      // Create a collapse button (keep the same style as the copy and download buttons)

      const foldButton = document.createElement("button");
      foldButton.setAttribute("role", "button");
      foldButton.setAttribute("aria-disabled", "false");
      foldButton.className = "code-fold-btn ds-atom-button ds-text-button ds-text-button--with-icon";
      foldButton.style.marginRight = "4px";

      foldButton.innerHTML = `
                <div class="ds-icon ds-atom-button__icon" style="font-size: 16px; width: 16px; height: 16px; margin-right: 3px;">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        ${UI.svg.fold}
                    </svg>
                </div>
                <span><span class="fold-text">折叠</span></span>
                <div class="ds-focus-ring"></div>
            `;

      // Insert after the copy button

      const copyButton = buttonContainer.querySelector(".ds-atom-button");
      if (copyButton) {
        copyButton.parentNode.insertBefore(foldButton, copyButton.nextSibling);
      } else {
        buttonContainer.insertBefore(foldButton, buttonContainer.firstChild);
      }

      // Add click event

      foldButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleFold(banner);
      });
    }

    // Add line number information to the language tag

    addLineCountInfo(banner, lineCount) {
      const languageSpan = banner.querySelector(".d813de27");
      if (!languageSpan) return;

      // Add row count information

      languageSpan.classList.add("language-with-lines");
      languageSpan.setAttribute("data-lines", `(${lineCount}行)`);
    }

    // Set initial collapse state

    setInitialFoldState(banner, lineCount, blockId) {
      let shouldCollapse = false;
      const savedState = GM_getValue(`foldState-${blockId}`);

      if (CONFIG.rememberState && savedState !== undefined) {
        shouldCollapse = savedState;
      } else {
        switch (CONFIG.defaultCollapse) {
          case "all":
            shouldCollapse = true;
            break;
          case "none":
            shouldCollapse = false;
            break;
          case "long":
            shouldCollapse = lineCount > CONFIG.longCodeLines;
            break;
        }
      }

      if (shouldCollapse) {
        this.collapseCodeBlock(banner);
      } else {
        this.expandCodeBlock(banner);
      }
    }

    // Toggle collapse state

    toggleFold(banner) {
      if (banner.classList.contains("collapsed")) {
        this.expandCodeBlock(banner);
      } else {
        this.collapseCodeBlock(banner);
      }
    }

    // Fold code block

    collapseCodeBlock(banner) {
      banner.classList.add("collapsed");

      // Update collapse button icon and text

      const foldButton = banner.querySelector(".code-fold-btn");
      if (foldButton) {
        const icon = foldButton.querySelector(".ds-icon svg");
        const text = foldButton.querySelector(".fold-text");

        // Update icon

        if (icon) {
          icon.innerHTML = '<path d="M8 11L5 8H7V5H9V8H11L8 11Z" fill="currentColor"></path>';
        }

        // Update text

        if (text) {
          text.textContent = "展开";
        }
      }

      // Save State

      this.saveBlockState(banner, true);
    }

    // Expand code block

    expandCodeBlock(banner) {
      banner.classList.remove("collapsed");

      // Update collapse button icon and text

      const foldButton = banner.querySelector(".code-fold-btn");
      if (foldButton) {
        const icon = foldButton.querySelector(".ds-icon svg");
        const text = foldButton.querySelector(".fold-text");

        // Update icon

        if (icon) {
          icon.innerHTML = UI.svg.unfold;
        }

        // Update text

        if (text) {
          text.textContent = "折叠";
        }
      }

      // Save State

      this.saveBlockState(banner, false);
    }

    // Save code block state

    saveBlockState(banner, isCollapsed) {
      if (CONFIG.rememberState) {
        const blockId = banner.dataset.foldId;
        if (blockId) {
          GM_setValue(`foldState-${blockId}`, isCollapsed);

          // Update Mapping

          if (this.codeBlocks.has(blockId)) {
            const blockInfo = this.codeBlocks.get(blockId);
            blockInfo.isCollapsed = isCollapsed;
            this.codeBlocks.set(blockId, blockInfo);
          }
        }
      }
    }

    // Collapse all code blocks

    collapseAllCodeBlocks() {
      document.querySelectorAll(".md-code-block-banner-wrap").forEach((banner) => {
        this.collapseCodeBlock(banner);
      });
    }

    // Expand all code blocks

    expandAllCodeBlocks() {
      document.querySelectorAll(".md-code-block-banner-wrap").forEach((banner) => {
        this.expandCodeBlock(banner);
      });
    }

    // Create a global control button

    createGlobalButton() {
      const button = document.createElement("button");
      button.className = "global-fold-btn";
      button.title = "代码块折叠控制";
      button.innerHTML = "≣";
      button.id = "global-fold-control-btn";

      document.body.appendChild(button);

      button.addEventListener("click", () => {
        this.toggleControlPanel();
      });
    }

    // Create Control Panel

    createControlPanel() {
      const panel = document.createElement("div");
      panel.className = "fold-control-panel";
      panel.id = "fold-control-panel";

      panel.innerHTML = `
                <h3>代码块折叠设置</h3>
                
                <div class="control-group">
                    <label for="defaultCollapse">默认折叠行为:</label>
                    <select id="defaultCollapse">
                        <option value="none">不折叠</option>
                        <option value="all">全部折叠</option>
                        <option value="long">折叠长代码块</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label for="longCodeLines">长代码块阈值 (行数):</label>
                    <input type="number" id="longCodeLines" min="5" max="100" value="15">
                </div>
                
                <div class="control-group">
                    <label>
                        <input type="checkbox" id="rememberState" checked> 记住折叠状态
                    </label>
                </div>
                
                <div class="panel-actions">
                    <button class="apply-btn">应用设置</button>
                    <button class="close-btn">关闭</button>
                </div>
            `;

      document.body.appendChild(panel);

      // Set Current Value

      document.getElementById("defaultCollapse").value = CONFIG.defaultCollapse;
      document.getElementById("longCodeLines").value = CONFIG.longCodeLines;
      document.getElementById("rememberState").checked = CONFIG.rememberState;

      // Add event listener

      document.querySelector(".apply-btn").addEventListener("click", () => {
        this.applySettings();
      });

      document.querySelector(".close-btn").addEventListener("click", () => {
        this.hideControlPanel();
      });

      // Click outside the panel to close

      document.addEventListener("click", (e) => {
        if (!panel.contains(e.target) && e.target.id !== "global-fold-control-btn") {
          this.hideControlPanel();
        }
      });
    }

    // Switch Control Panel Display

    toggleControlPanel() {
      const panel = document.getElementById("fold-control-panel");
      panel.classList.toggle("visible");
    }

    // Hide Control Panel

    hideControlPanel() {
      const panel = document.getElementById("fold-control-panel");
      panel.classList.remove("visible");
    }

    // App Settings

    applySettings() {
      // Update Configuration

      CONFIG.defaultCollapse = document.getElementById("defaultCollapse").value;
      CONFIG.longCodeLines = parseInt(document.getElementById("longCodeLines").value);
      CONFIG.rememberState = document.getElementById("rememberState").checked;

      // Save Configuration

      this.saveConfig();

      // Reprocess all code blocks

      this.reprocessAllCodeBlocks();

      // Show success message

      const applyBtn = document.querySelector(".apply-btn");
      const originalText = applyBtn.textContent;
      applyBtn.textContent = "已应用!";
      applyBtn.style.background = "#4CAF50";

      setTimeout(() => {
        applyBtn.textContent = originalText;
        applyBtn.style.background = "";
      }, 1500);
    }

    // Reprocess all code blocks

    reprocessAllCodeBlocks() {
      // Remove all existing collapse buttons

      document.querySelectorAll(".code-fold-btn").forEach((btn) => btn.remove());

      // Remove the line number information from the language tag

      document.querySelectorAll(".language-with-lines").forEach((span) => {
        span.classList.remove("language-with-lines");
        span.removeAttribute("data-lines");
      });

      // Remove collapsed state

      document.querySelectorAll(".md-code-block-banner-wrap.collapsed").forEach((banner) => {
        banner.classList.remove("collapsed");
      });

      // Clear processed collection

      this.processedBlocks = new WeakSet();

      // Clear code block mapping

      this.codeBlocks.clear();

      // Reprocess all code blocks

      this.processAllCodeBlocks();
    }

    // Set up a mutation observer to monitor DOM changes

    setupMutationObserver() {
      const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;

        mutations.forEach((mutation) => {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            // Check if new code blocks have been added

            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) {
                // Element node

                if (node.classList && node.classList.contains("md-code-block-banner-wrap")) {
                  shouldProcess = true;
                } else if (node.querySelectorAll) {
                  const banners = node.querySelectorAll(".md-code-block-banner-wrap");
                  if (banners.length > 0) {
                    shouldProcess = true;
                  }
                }
              }
            });
          }
        });

        if (shouldProcess) {
          // Delay processing to ensure the DOM is fully loaded

          setTimeout(() => {
            this.processAllCodeBlocks();
          }, 500);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    // Set keyboard shortcuts

    setupKeyboardShortcuts() {
      document.addEventListener("keydown", (e) => {
        // Ctrl Shift C: Collapse/Expand the currently focused code block

        if (e.altKey && e.key === "C") {
          const focused = document.activeElement;
          const banner = focused.closest(".md-code-block-banner-wrap");
          if (banner) {
            this.toggleFold(banner);
          }
        }

        // Ctrl Shift Left Arrow: Collapse all code blocks

        if (e.ctrlKey && e.shiftKey && e.key === "ArrowLeft") {
          this.collapseAllCodeBlocks();
        }

        // Ctrl Shift Right Arrow: Expand all code blocks

        if (e.ctrlKey && e.shiftKey && e.key === "ArrowRight") {
          this.expandAllCodeBlocks();
        }
      });
    }
  }

  // Initialize after the page has finished loading

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      new CodeBlockFolder();
    });
  } else {
    new CodeBlockFolder();
  }
})();
