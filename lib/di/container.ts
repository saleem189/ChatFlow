// ================================
// Dependency Injection Container
// ================================
// Centralized service instantiation and dependency management
// Supports both synchronous and asynchronous factory registration
// Enables runtime service selection via configuration

import { ConfigService } from '@/lib/config/config.service';
import type { ILogger } from '@/lib/logger/logger.interface';

type Factory<T> = () => T | Promise<T>;
type AsyncFactory<T> = (config?: Record<string, unknown>) => Promise<T>;

class DIContainer {
  private services = new Map<string, Factory<any>>();
  private factories = new Map<string, AsyncFactory<any>>();
  private singletons = new Map<string, any>();
  private configService: ConfigService | null = null;

  /**
   * Set the config service (required for factory support)
   */
  setConfigService(configService: ConfigService): void {
    this.configService = configService;
  }

  /**
   * Register a service factory (synchronous or asynchronous)
   * @param key - Service identifier
   * @param factory - Factory function that creates the service
   * @param singleton - Whether to cache the instance (default: true)
   */
  register<T>(key: string, factory: Factory<T>, singleton: boolean = true): void {
    const factoryResult = factory();
    
    // If factory returns a Promise, treat it as async and use factories map
    if (factoryResult instanceof Promise) {
      if (singleton) {
        this.factories.set(key, async () => {
          if (!this.singletons.has(key)) {
            const instance = await factoryResult;
            this.singletons.set(key, instance);
          }
          return this.singletons.get(key);
        });
      } else {
        this.factories.set(key, async () => await factoryResult);
      }
      return;
    }
    
    // Synchronous factory
    if (singleton) {
      // Store factory and create on first access
      this.services.set(key, () => {
        if (!this.singletons.has(key)) {
          this.singletons.set(key, factoryResult);
        }
        return this.singletons.get(key);
      });
    } else {
      // Always create new instance
      this.services.set(key, () => factoryResult);
    }
  }

  /**
   * Register an async factory that can resolve config at runtime
   * @param key - Service identifier
   * @param factory - Async factory function
   * @param configKey - Optional config key to fetch configuration
   */
  registerFactory<T>(
    key: string,
    factory: AsyncFactory<T>,
    configKey?: string
  ): void {
    this.factories.set(key, async () => {
      // Check cache first
      if (this.singletons.has(key)) {
        return this.singletons.get(key);
      }

      // Get config if needed
      let config: Record<string, unknown> | undefined = undefined;
      if (configKey && this.configService) {
        try {
          const configValue = await this.configService.get(configKey, undefined);
          config = typeof configValue === 'object' && configValue !== null 
            ? configValue as Record<string, unknown>
            : undefined;
        } catch (error) {
          // Config key not found - use defaults (logger not available at this point)
          console.warn(`[DI Container] Config key '${configKey}' not found for service '${key}', using defaults`);
        }
      }

      // Create instance
      const instance = await factory(config);

      // Cache singleton
      this.singletons.set(key, instance);
      return instance;
    });
  }

  /**
   * Resolve a service by key (supports both sync and async)
   * @param key - Service identifier
   * @returns Service instance (Promise if async)
   */
  async resolve<T>(key: string): Promise<T> {
    // Try factory first (async)
    if (this.factories.has(key)) {
      const factory = this.factories.get(key)!;
      return await factory();
    }

    // Try regular service (sync or async)
    if (this.services.has(key)) {
      const factory = this.services.get(key)!;
      const instance = factory();
      if (instance instanceof Promise) {
        return await instance;
      }
      return instance as T;
    }

    throw new Error(`Service '${key}' not found. Make sure it's registered.`);
  }

  /**
   * Resolve a service synchronously (only for sync services)
   * @param key - Service identifier
   * @returns Service instance
   */
  resolveSync<T>(key: string): T {
    if (this.factories.has(key)) {
      throw new Error(`Service '${key}' is an async factory. Use resolve() instead.`);
    }

    if (this.services.has(key)) {
      const factory = this.services.get(key)!;
      const instance = factory();
      if (instance instanceof Promise) {
        throw new Error(`Service '${key}' factory returned a Promise. Use resolve() instead.`);
      }
      return instance as T;
    }

    throw new Error(`Service '${key}' not found. Make sure it's registered.`);
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }

  /**
   * Clear singleton cache for a specific service
   */
  clearSingleton(key: string): void {
    this.singletons.delete(key);
    // Logger not available at this point - use console
    console.log(`[DI Container] Singleton cache cleared for service: ${key}`);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
    // Logger not available at this point - use console
    console.log('[DI Container] All singleton caches cleared');
  }

  /**
   * Get all registered service keys
   */
  getRegisteredKeys(): string[] {
    const serviceKeys = Array.from(this.services.keys());
    const factoryKeys = Array.from(this.factories.keys());
    const allKeys = [...serviceKeys, ...factoryKeys];
    return Array.from(new Set(allKeys));
  }

  /**
   * Destroy all services that have cleanup methods
   * Calls destroy() on all services that implement it
   * Used for graceful shutdown and resource cleanup
   */
  async destroy(): Promise<void> {
    const destroyPromises: Promise<void>[] = [];
    let logger: ILogger | null = null;

    // Try to get logger for error reporting, but don't fail if unavailable
    try {
      if (this.singletons.has('logger')) {
        logger = this.singletons.get('logger') as ILogger;
      }
    } catch {
      // Logger not available, will use console
    }

    // Call destroy() on all services that have it
    for (const [key, instance] of this.singletons.entries()) {
      if (instance && typeof (instance as any).destroy === 'function') {
        destroyPromises.push(
          Promise.resolve((instance as any).destroy()).catch((err) => {
            // Use logger if available, otherwise console
            if (logger) {
              logger.error(`Error destroying service '${key}':`, err, {
                component: 'DIContainer',
                service: key,
              });
            } else {
              console.error(`[DI Container] Error destroying service '${key}':`, err);
            }
          })
        );
      }
    }

    // Wait for all destroy operations to complete (or fail gracefully)
    await Promise.allSettled(destroyPromises);

    // Clear all caches after cleanup
    this.clear();
  }
}

// Export singleton instance
export const container = new DIContainer();

