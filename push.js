class Push {
  static check() {
    if (Notification.permission === "granted") {
      return true;
    }

    return false;
  }

  static async request() {
    switch (Notification.permission) {
      case "granted":
        return true;
      case "denied":
        return false;
    }

    let permission = await Notification.requestPermission();
    if (permission === "granted") {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Show a notification
   * @param {string} title
   * @param {NotificationOptions | undefined} options
   * @returns {Promise<Notification | null>}
   */
  static async show(title, options) {
    let ok = await Push.request();
    if (ok) {
      return new Notification(title, options);
    }

    return null;
  }
}

window.DebugPush = Push;
