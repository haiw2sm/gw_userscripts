// ==UserScript==
// @name         DeepSeek Code Block Collapser
// @namespace    http://tampermonkey.net/
// @version      1.0.1
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
    // Default collapse state: 'none' - do not collapse, 'all' - collapse all, 'long' - only collapse long code blocks

    defaultCollapse: "long",
    // Line count threshold for long code blocks (effective when default collapse is set to 'long')

    longCodeLines: 15,
    // Fold button position: 'top-left', 'top-right', 'bottom-left', 'bottom-right'

    buttonPosition: "top-right",
    // Show line numbers

    showLineNumbers: true,
    // Whether to remember the folded state of each code block

    rememberState: true,
    // Animation effect

    useAnimation: true,
    //
    TARGET_SELECTORS: ["pre", "code", ".code-block", ".language-*", '[class*="language-"]', ".prose pre"],
  };

  // Add custom style

  GM_addStyle(`
        /* 代码块容器样式 */
        .code-block-container {
            position: relative;
            margin: 10px 0;
            border-radius: 8px;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        /* 折叠状态下的代码块容器 */
        .code-block-container.collapsed {
            max-height: 200px;
            overflow: hidden;
        }

        /* 代码块样式 */
        .code-block-container pre {
            margin: 0 !important;
            padding: 16px !important;
            border-radius: 0 !important;
            overflow-x: auto;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
            transition: max-height 0.3s ease;
        }

        /* 折叠按钮样式 */
        .code-fold-btn {
            position: absolute;
            z-index: 10;
            padding: 4px 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            transition: all 0.2s ease;
            opacity: 0.8;
        }

        .code-fold-btn:hover {
            opacity: 1;
            background: rgba(0, 0, 0, 0.9);
        }

        /* 按钮位置 */
        .code-fold-btn.top-left {
            top: 10px;
            left: 10px;
        }

        .code-fold-btn.top-right {
            top: 10px;
            right: 10px;
        }

        .code-fold-btn.bottom-left {
            bottom: 10px;
            left: 10px;
        }

        .code-fold-btn.bottom-right {
            bottom: 10px;
            right: 10px;
        }

        /* 折叠指示器 */
        .fold-indicator {
            display: inline-block;
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            transition: transform 0.2s ease;
        }

        .fold-indicator.expanded {
            border-top: 6px solid white;
        }

        .fold-indicator.collapsed {
            border-bottom: 6px solid white;
            transform: rotate(180deg);
        }

        /* 折叠遮罩 */
        .fold-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.7));
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding-bottom: 10px;
            pointer-events: none;
            opacity: 1;
            transition: opacity 0.3s ease;
        }

        .code-block-container:not(.collapsed) .fold-overlay {
            opacity: 0;
            pointer-events: none;
        }

        /* 行号样式 */
        .line-numbers {
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            padding: 16px 8px;
            background: rgba(0, 0, 0, 0.1);
            color: #666;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
            font-size: 14px;
            line-height: 1.5;
            text-align: right;
            user-select: none;
            overflow: hidden;
        }

        /* 代码块工具栏 */
        .code-toolbar {
            display: flex;
            justify-content: flex-end;
            padding: 6px 10px;
            background: rgba(0, 0, 0, 0.05);
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            gap: 8px;
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .code-block-container:hover .code-toolbar {
            opacity: 1;
        }

        .code-toolbar button {
            padding: 4px 8px;
            background: rgba(0, 0, 0, 0.1);
            border: none;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            color: #555;
        }

        .code-toolbar button:hover {
            background: rgba(0, 0, 0, 0.15);
            color: #333;
        }

        /* 全局控制面板 */
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

        /* 全局控制按钮 */
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
            .code-fold-btn {
                padding: 3px 8px;
                font-size: 11px;
            }

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
      // Find the code block in deep seek

      const selectors = CONFIG.TARGET_SELECTORS;

      let codeElements = [];

      // Try different selectors

      selectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            // Filter out non-code blocks or elements that are too small

            if (el.textContent && el.textContent.trim().length > 10 && (el.tagName === "PRE" || el.textContent.includes("\n") || el.classList.toString().includes("language"))) {
              codeElements.push(el);
            }
          });
        } catch (e) {
          // Ignore invalid selectors
        }
      });

      // Remove duplicates

      codeElements = [...new Set(codeElements)];

      // Process each code block

      codeElements.forEach((codeBlock) => {
        if (!this.processedBlocks.has(codeBlock)) {
          this.wrapCodeBlock(codeBlock);
        }
      });
    }

    // Wrap code block

    wrapCodeBlock(codeElement) {
      // If already packaged, skip

      if (codeElement.parentElement && codeElement.parentElement.classList.contains("code-block-container")) {
        return;
      }

      // Create Container

      const container = document.createElement("div");
      container.className = "code-block-container";

      // Generate a unique ID

      const blockId = "code-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
      container.id = blockId;

      // Get code language

      let language = "code";
      for (const className of codeElement.classList) {
        if (className.startsWith("language-")) {
          language = className.replace("language-", "");
          break;
        }
      }

      // Get the number of lines of code

      const codeText = codeElement.textContent || "";
      const lineCount = codeText.split("\n").length;

      // Wrap code block

      codeElement.parentNode.insertBefore(container, codeElement);
      container.appendChild(codeElement);

      // Add line numbers

      if (CONFIG.showLineNumbers && lineCount > 1) {
        this.addLineNumbers(container, lineCount);
      }

      // Add Toolbar

      this.addToolbar(container, language, lineCount);

      // Add a collapse button

      this.addFoldButton(container, lineCount);

      // Add folding mask

      this.addFoldOverlay(container);

      // Set initial collapse state

      this.setInitialFoldState(container, lineCount, blockId);

      // Mark as processed

      this.processedBlocks.add(codeElement);

      // Save to map

      this.codeBlocks.set(blockId, {
        element: container,
        lineCount,
        language,
        isCollapsed: container.classList.contains("collapsed"),
      });
    }

    // Add line numbers

    addLineNumbers(container, lineCount) {
      const lineNumbers = document.createElement("div");
      lineNumbers.className = "line-numbers";

      let numbersHTML = "";
      for (let i = 1; i <= lineCount; i++) {
        numbersHTML += `<div>${i}</div>`;
      }

      lineNumbers.innerHTML = numbersHTML;
      container.appendChild(lineNumbers);

      // Adjust the left margin of the code block to accommodate line numbers

      const codeElement = container.querySelector("pre, code");
      if (codeElement) {
        codeElement.style.marginLeft = "40px";
        codeElement.style.paddingLeft = "12px";
      }
    }

    // Add Toolbar

    addToolbar(container, language, lineCount) {
      const toolbar = document.createElement("div");
      toolbar.className = "code-toolbar";

      toolbar.innerHTML = `
                <span style="margin-right: auto; font-size: 12px; color: #666;">${language} (${lineCount} 行)</span>
                <!--
			   <button class="copy-btn">复制</button>
                <button class="expand-all-btn">全部展开</button>
			   -->
			   <button class="collapse-all-btn">全部折叠</button>
            `;

      container.insertBefore(toolbar, container.firstChild);

      // Add toolbar event

      toolbar.querySelector(".copy-btn").addEventListener("click", () => {
        this.copyCode(container);
      });

      toolbar.querySelector(".expand-all-btn").addEventListener("click", () => {
        this.expandAllCodeBlocks();
      });

      toolbar.querySelector(".collapse-all-btn").addEventListener("click", () => {
        this.collapseAllCodeBlocks();
      });
    }

    // Add a collapse button

    addFoldButton(container, lineCount) {
      const button = document.createElement("button");
      button.className = `code-fold-btn ${CONFIG.buttonPosition}`;
      button.innerHTML = `
                <span class="fold-indicator expanded"></span>
                <span class="fold-text">折叠</span>
            `;

      container.appendChild(button);

      // Add click event

      button.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleFold(container);
      });
    }

    // Add folding mask

    addFoldOverlay(container) {
      const overlay = document.createElement("div");
      overlay.className = "fold-overlay";
      overlay.innerHTML =
        '<button class="expand-from-overlay" style="background: rgba(255,255,255,0.9); color: #333; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; pointer-events: auto;">展开代码</button>';

      container.appendChild(overlay);

      overlay.querySelector(".expand-from-overlay").addEventListener("click", (e) => {
        e.stopPropagation();
        this.expandCodeBlock(container);
      });
    }

    // Set initial collapse state

    setInitialFoldState(container, lineCount, blockId) {
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
        this.collapseCodeBlock(container);
      } else {
        this.expandCodeBlock(container);
      }
    }

    // Toggle collapse state

    toggleFold(container) {
      if (container.classList.contains("collapsed")) {
        this.expandCodeBlock(container);
      } else {
        this.collapseCodeBlock(container);
      }
    }

    // Fold code block

    collapseCodeBlock(container) {
      container.classList.add("collapsed");

      const button = container.querySelector(".code-fold-btn");
      if (button) {
        const indicator = button.querySelector(".fold-indicator");
        const text = button.querySelector(".fold-text");

        indicator.classList.remove("expanded");
        indicator.classList.add("collapsed");
        text.textContent = "展开";
      }

      // Save State

      this.saveBlockState(container, true);
    }

    // Expand code block

    expandCodeBlock(container) {
      container.classList.remove("collapsed");

      const button = container.querySelector(".code-fold-btn");
      if (button) {
        const indicator = button.querySelector(".fold-indicator");
        const text = button.querySelector(".fold-text");

        indicator.classList.remove("collapsed");
        indicator.classList.add("expanded");
        text.textContent = "折叠";
      }

      // Save State

      this.saveBlockState(container, false);
    }

    // Save code block state

    saveBlockState(container, isCollapsed) {
      if (CONFIG.rememberState) {
        const blockId = container.id;
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

    // Copy code

    copyCode(container) {
      const codeElement = container.querySelector("pre, code");
      if (!codeElement) return;

      const codeText = codeElement.textContent;

      navigator.clipboard
        .writeText(codeText)
        .then(() => {
          const copyBtn = container.querySelector(".copy-btn");
          const originalText = copyBtn.textContent;
          copyBtn.textContent = "已复制!";
          copyBtn.style.background = "#4CAF50";
          copyBtn.style.color = "white";

          setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = "";
            copyBtn.style.color = "";
          }, 2000);
        })
        .catch((err) => {
          console.error("复制失败:", err);
          alert("复制失败，请手动选择并复制代码");
        });
    }

    // Collapse all code blocks

    collapseAllCodeBlocks() {
      document.querySelectorAll(".code-block-container").forEach((container) => {
        this.collapseCodeBlock(container);
      });
    }

    // Expand all code blocks

    expandAllCodeBlocks() {
      document.querySelectorAll(".code-block-container").forEach((container) => {
        this.expandCodeBlock(container);
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
                    <label for="buttonPosition">折叠按钮位置:</label>
                    <select id="buttonPosition">
                        <option value="top-right">右上角</option>
                        <option value="top-left">左上角</option>
                        <option value="bottom-right">右下角</option>
                        <option value="bottom-left">左下角</option>
                    </select>
                </div>

                <div class="control-group">
                    <label>
                        <input type="checkbox" id="showLineNumbers" checked> 显示行号
                    </label>
                </div>

                <div class="control-group">
                    <label>
                        <input type="checkbox" id="rememberState" checked> 记住折叠状态
                    </label>
                </div>

                <div class="control-group">
                    <label>
                        <input type="checkbox" id="useAnimation" checked> 使用动画效果
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
      document.getElementById("buttonPosition").value = CONFIG.buttonPosition;
      document.getElementById("showLineNumbers").checked = CONFIG.showLineNumbers;
      document.getElementById("rememberState").checked = CONFIG.rememberState;
      document.getElementById("useAnimation").checked = CONFIG.useAnimation;

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
      CONFIG.buttonPosition = document.getElementById("buttonPosition").value;
      CONFIG.showLineNumbers = document.getElementById("showLineNumbers").checked;
      CONFIG.rememberState = document.getElementById("rememberState").checked;
      CONFIG.useAnimation = document.getElementById("useAnimation").checked;

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
      // Remove all existing packaging

      document.querySelectorAll(".code-block-container").forEach((container) => {
        const codeElement = container.querySelector("pre, code");
        if (codeElement) {
          container.parentNode.insertBefore(codeElement, container);
          container.remove();
        }
      });

      // Clear processed collection

      this.processedBlocks = new WeakSet();

      // Reprocess all code blocks

      this.processAllCodeBlocks();
    }

    // Set up a mutation observer to monitor DOM changes

    setupMutationObserver() {
      const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;

        mutations.forEach((mutation) => {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            shouldProcess = true;
          }
        });

        if (shouldProcess) {
          // Delay processing to ensure the DOM is fully loaded

          setTimeout(() => {
            this.processAllCodeBlocks();
          }, 300);
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

        if (e.ctrlKey && e.shiftKey && e.key === "C") {
          const focused = document.activeElement;
          const container = focused.closest(".code-block-container");
          if (container) {
            this.toggleFold(container);
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
