// ==UserScript==
// @name         universal.injector
// @namespace    https://github.com/haiw2sm/gw_userscripts
// @version      2025-12-08
// @description  try to take over the world!
// @author       haiw2sm
// @match        *://*/*
// @run-at       document-start
// @icon         https://favicon.pub/pranx.com
// @grant        none
// ==/UserScript==

(function () {
  "use strict";
  /**
   * JS VM Environment Value Detection and Stubbing Tool
   * @param {string|object} target - Detection targets (supports object path strings like 'window.console.log' or directly passing the object)
   * @param {any} stubValue - Replacement value/function after stubbing
   * @returns {object} Includes a method to restore the original value
   */
  function detectAndStub(target, stubValue) {
    // Store raw value

    let originalValue;
    // Parse the target path (e.g., split 'window.console.log' into ['window', 'console', 'log'])

    let targetObj;
    let targetProp;

    // Handling different types of target parameters

    if (typeof target === "string") {
      const pathArr = target.split(".");
      targetProp = pathArr.pop();
      // Access the target object layer by layer (e.g., window.console)

      targetObj = pathArr.reduce((obj, prop) => {
        return obj && obj[prop] ? obj[prop] : null;
      }, window);
    } else {
      // If you pass the object directly, it will stub its default behavior by default (applicable to functions/objects)

      targetObj = { __target: target };
      targetProp = "__target";
    }

    // Check if the target exists

    const isExist = targetObj && targetProp in targetObj && targetObj[targetProp] !== undefined;

    if (isExist) {
      console.log(`Target detected [${target}] Exists, start piling`);
      // Save original value

      originalValue = targetObj[targetProp];
      // Perform Stubbing: Replace with Custom Value/Function

      let stubbed =
        typeof stubValue === "function"
          ? (...args) => {
              // Optional: Add logging for stub calls
              // console.log(`[Stub call] ${target}, arguments:`, args);

              return stubValue.apply(this, args);
            }
          : stubValue;

      // Ensure the prototype chain is correct

      if (typeof originalValue === "function" && typeof stubbed === "function") {
        stubbed.prototype = originalValue.prototype;
        Object.setPrototypeOf(stubbed, originalValue);
        stubbed.prototype.constructor = stubbed;
      }

      targetObj[targetProp] = stubbed;
      // Return recovery function

      return {
        restore: () => {
          if (originalValue !== undefined) {
            targetObj[targetProp] = originalValue;
            console.log(`The original value of [${target}] has been restored`);
          }
        },
        originalValue: originalValue,
        stubbedValue: stubbed,
      };
    } else {
      console.warn(`Target [${target}] not detected, skipping instrumentation`);
      return {
        restore: () => console.warn("No original value can be restored"),
      };
    }
  }

  let to = detectAndStub("window.Function", function (args) {
    let params = typeof args === "string" ? args : Array.isArray(args) ? args[0] : "";
    if (params.includes("Function") && params.match(/bugger|debugger|bug/)) {
      // console.log('anti-debugger detected...');

      return function () {};
    }
    return to.originalValue.apply(this, args);
  });
  // Your code here...
})();
