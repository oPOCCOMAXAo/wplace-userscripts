const baseURL = "https://backend.wplace.live";

/**
 * @typedef {Object} MeResponse
 * @property {Charges} charges
 */

/**
 * @typedef {Object} Charges
 * @property {number} cooldownMs - int
 * @property {number} count - float
 * @property {number} max - int
 */

class Client {
  /**
   * Get the current user's information
   * @returns {Promise<MeResponse|undefined>}
   */
  static async getMe() {
    const response = await fetch(`${baseURL}/me`, {
      credentials: "include",
    });
    if (!response.ok) {
      return undefined;
    }

    return response.json();
  }
}

window.DebugClient = Client;
