/**
 * Base abstract class for third-party digital fulfillment / game top-up adapters.
 * All third-party providers (e.g., UniPin, SmileOne, Lapakgaming, RazerGold, etc.)
 * should extend this base class.
 */
export class BaseProviderAdapter {
  constructor(name) {
    this.name = name;
  }

  /**
   * Dispatches a top-up request to the provider.
   * @param {Object} params
   * @param {Object} params.order - The order entity.
   * @param {Object} params.item - The order item entity.
   * @param {Object} params.accountInfo - Dynamic customer field inputs (e.g. { userId, zoneId }).
   * @param {Object} params.config - Provider specific configuration (serviceCode, credentials, extra).
   * @returns {Promise<{ success: boolean, referenceId: string, message: string, rawResponse: any }>}
   */
  async processTopUp({ order, item, accountInfo, config }) { // eslint-disable-line no-unused-vars
    throw new Error(`processTopUp is not implemented on adapter ${this.name}`);
  }

  /**
   * Checks the status of a previous top-up transaction with the provider.
   * @param {string} referenceId
   * @param {Object} config
   * @returns {Promise<{ status: 'pending' | 'completed' | 'failed', message: string, rawResponse: any }>}
   */
  async checkStatus(referenceId, config) { // eslint-disable-line no-unused-vars
    throw new Error(`checkStatus is not implemented on adapter ${this.name}`);
  }

  /**
   * Retrieves provider account balance / quota.
   * @param {Object} config
   * @returns {Promise<{ balance: number, currency: string }>}
   */
  async getBalance(config) { // eslint-disable-line no-unused-vars
    return { balance: 0, currency: 'USD' };
  }
}
