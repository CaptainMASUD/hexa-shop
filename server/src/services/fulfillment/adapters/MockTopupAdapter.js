import { BaseProviderAdapter } from './BaseProviderAdapter.js';

/**
 * Mock / Sample Provider Adapter demonstrating third-party API top-up integration.
 */
export class MockTopupAdapter extends BaseProviderAdapter {
  constructor() {
    super('mock');
  }

  async processTopUp({ order, item, accountInfo, config }) {
    const serviceCode = config?.serviceCode || item?.variantSku || 'DEFAULT_SKU';
    const referenceId = `MOCK-TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    return {
      success: true,
      referenceId,
      message: `Simulated top-up of ${item.variantName || item.productName} for account ${JSON.stringify(accountInfo)} (${serviceCode}) succeeded.`,
      rawResponse: {
        status: 'SUCCESS',
        orderNumber: order.orderNumber,
        serviceCode,
        deliveredAt: new Date().toISOString(),
      },
    };
  }

  async checkStatus(referenceId) {
    return {
      status: 'completed',
      message: `Transaction ${referenceId} is completed.`,
      rawResponse: { referenceId, status: 'COMPLETED' },
    };
  }

  async getBalance() {
    return {
      balance: 10000,
      currency: 'USD',
    };
  }
}
