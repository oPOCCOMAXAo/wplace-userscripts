// ==UserScript==
// @name         wplace alarm
// @namespace    opoccomaxao.github.io
// @version      1.0.2
// @description  Alarms for wplace
// @author       opoccomaxao
// @match        https://wplace.live
// @match        https://wplace.live/*
// @icon         https://wplace.live/favicon.ico
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @require      ./client.js
// @require      ./push.js
// @require      ./image.js
// @require      ./config.js
// ==/UserScript==

const DEFAULT_INTERVAL_MS = 1000 * 60 * 5; // 5 minutes.
const RETRY_INTERVAL_MS = 1000 * 10;

/**
 * @typedef {Object} Threshold
 * @property {number} value
 * @property {boolean} isPercent
 */

class Threshold {
  constructor(value, isPercent) {
    this.value = value;
    this.isPercent = isPercent;
  }

  toString() {
    return `${this.value}${this.isPercent ? "%" : ""}`;
  }

  toAbsolute(max = 0) {
    if (!this.isPercent) {
      return this.value;
    }

    return (this.value / 100) * max;
  }

  /**
   * @param {string} str
   * @returns {Threshold}
   */
  static parse(str) {
    let match = str.match(/^(\d+)(%)?$/);
    if (match) {
      let value = parseInt(match[1], 10);
      value = Math.max(value, 0);

      let isPercent = !!match[2];
      if (isPercent) {
        value = Math.min(value, 100);
      }

      return new Threshold(value, isPercent);
    }

    return new Threshold(0, false);
  }

  /**
   * @param {string[]} arr
   * @returns {Threshold[]}
   */
  static parseArray(arr) {
    return arr.map((item) => this.parse(item)).filter((item) => item !== null);
  }

  static compare(l, r) {
    if (l.isPercent !== r.isPercent) {
      return r.isPercent ? -1 : 1;
    }

    return l.value - r.value;
  }
}

const globalData = {
  thresholds: [100000], // Absolute.
  prevThreshold: 0,
  prevCount: 0,
  prevMax: 1,
};

window.globalData = globalData;

async function showPixelsNotification({ counter = 0, max = 1 }) {
  counter = Math.floor(counter);
  let percent = Math.floor((counter / max) * 100);
  let debug = Config.getObject("debug");

  let picture = Config.getObject("picture")
    ? Image.generateBadgeCounter({
        counter: counter,
        bgColor: "#0000ff",
        textColor: "#ffffff",
        size: 64,
        textSize: 24,
      })
    : null;

  await Push.show(`Your pixels`, {
    icon: picture,
    badge: picture,
    body: `You have ${counter} pixels.\n${percent}% of ${max} pixels${
      debug ? `\nDebug info: ${JSON.stringify(globalData, null, 2)}` : ""
    }`,
    requireInteraction: true,
  });
}

async function updateMe() {
  let data = await Client.getMe().catch((error) => {
    console.error(error);
    setTimeout(updateMe, RETRY_INTERVAL_MS);
  });

  if (data == undefined) {
    setTimeout(updateMe, RETRY_INTERVAL_MS);

    return;
  }

  let sleepMs = await updateNotifications(data.charges);
  if (sleepMs > 0 && sleepMs < DEFAULT_INTERVAL_MS) {
    setTimeout(updateMe, sleepMs);

    return;
  }
}

function recalculateThresholds() {
  let stored = Threshold.parseArray(Config.getObject("thresholds") || []);
  globalData.thresholds = stored.map((t) => t.toAbsolute(globalData.prevMax));

  let set = new Set(globalData.thresholds);
  set.delete(0);

  globalData.thresholds = [...set];
  globalData.thresholds.sort((l, r) => l - r);
}

/**
 * @returns {Promise<number>} - Time until next notification.
 */
async function updateNotifications({ max, count, cooldownMs }) {
  if (globalData.prevCount > count) {
    globalData.prevThreshold = globalData.thresholds.findLast((t) => t < count);
  }

  globalData.prevCount = count;

  if (globalData.prevMax != max) {
    globalData.prevMax = max;
    recalculateThresholds();
  }

  let nowThreshold = globalData.thresholds.findLast((t) => t < count);
  if (nowThreshold != null && nowThreshold != globalData.prevThreshold) {
    globalData.prevThreshold = nowThreshold;
    showPixelsNotification({ counter: count, max });
  }

  let nextThreshold = globalData.thresholds.find((t) => t > count);
  if (nextThreshold != null) {
    let deltaTimeMs = (nextThreshold - count) * cooldownMs;
    return Math.max(deltaTimeMs, 0);
  }

  return 0;
}

function main() {
  setInterval(updateMe, DEFAULT_INTERVAL_MS);
  window.addEventListener("blur", updateMe);
  registerMenuCommands();

  updateMe();
}

main();

function registerMenuCommands() {
  GM_registerMenuCommand("Show thresholds", showThresholds);
  GM_registerMenuCommand("Add threshold", addThreshold);
  GM_registerMenuCommand("Remove threshold", removeThreshold);
  GM_registerMenuCommand("Clear thresholds", clearThresholds);

  registerPushRequestCommand();

  registerToggleCommand("debug");
  registerToggleCommand("picture");
}

function registerToggleCommand(paramName, options = {}) {
  if (options.command) {
    GM_unregisterMenuCommand(options.command);
  }

  let value = Config.getObject(paramName) || false;

  options.command = GM_registerMenuCommand(
    value ? `Disable ${paramName}` : `Enable ${paramName}`,
    () => {
      Config.setObject(paramName, !value);
      registerToggleCommand(paramName, options);
    },
  );
}

function registerPushRequestCommand(options = {}) {
  if (Push.check()) {
    return;
  }

  options.command = GM_registerMenuCommand("Request notifications", async () => {
    let success = await Push.request();
    if (success && options.command) {
      GM_unregisterMenuCommand(options.command);
    }
  });
}

function showThresholds() {
  let thresholds = Config.getObject("thresholds") || [];

  let message = "";
  if (thresholds.length === 0) {
    message = "No thresholds set";
  } else {
    message = `Current thresholds:\n${thresholds.join("\n")}`;
  }

  alert(message);
}

function addThreshold() {
  let value = prompt("Enter new threshold:");

  value = Threshold.parse(value).toString();

  if (value) {
    let prev = Config.getObject("thresholds") || [];
    prev.push(value);
    saveAndUpdateThresholds(prev);
    showThresholds();
  }
}

function removeThreshold() {
  let value = prompt("Enter threshold to remove:");
  if (value) {
    let prev = Config.getObject("thresholds") || [];
    prev = prev.filter((t) => t !== value);
    saveAndUpdateThresholds(prev);
    showThresholds();
  }
}

function clearThresholds() {
  saveAndUpdateThresholds([]);
  showThresholds();
}

/**
 * Prepares and saves the thresholds.
 * @param {string[]} thresholds
 */
function saveAndUpdateThresholds(thresholds) {
  if (thresholds.length > 0) {
    let set = new Set(thresholds);
    set.delete("0");

    thresholds = [...set];
    let parsed = Threshold.parseArray(thresholds);
    parsed.sort(Threshold.compare);
    thresholds = parsed.map((t) => t.toString());
  }

  Config.setObject("thresholds", thresholds);
  recalculateThresholds();
  updateMe();
}
