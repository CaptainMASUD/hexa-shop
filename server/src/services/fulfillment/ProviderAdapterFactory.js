import { MockTopupAdapter } from './adapters/MockTopupAdapter.js';

class ProviderAdapterFactory {
  constructor() {
    this.adapters = new Map();
    // Register default / built-in adapters
    this.register('mock', new MockTopupAdapter());
    this.register('default', new MockTopupAdapter());
  }

  /**
   * Register a new provider adapter.
   * @param {string} name
   * @param {import('./adapters/BaseProviderAdapter.js').BaseProviderAdapter} adapter
   */
  register(name, adapter) {
    this.adapters.set(String(name).toLowerCase(), adapter);
  }

  /**
   * Get an adapter by name.
   * @param {string} name
   * @returns {import('./adapters/BaseProviderAdapter.js').BaseProviderAdapter}
   */
  get(name) {
    if (!name) return this.adapters.get('default');
    const adapter = this.adapters.get(String(name).toLowerCase());
    return adapter || this.adapters.get('default');
  }

  /**
   * List all registered provider names.
   * @returns {string[]}
   */
  list() {
    return Array.from(this.adapters.keys());
  }
}

export const providerFactory = new ProviderAdapterFactory();
