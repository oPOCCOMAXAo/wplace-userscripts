class Config {
  /**
   * @param {string} name
   * @returns {object|null}
   */
  static getObject(name) {
    let value = GM_getValue(name);
    if (value != null) {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * @param {string} name
   * @param {object} value
   * @returns {void}
   */
  static setObject(name, value) {
    return GM_setValue(name, JSON.stringify(value));
  }
}
