// ================================
// Dependency Injection Container
// ================================
// Centralized service instantiation and dependency management

type Factory<T> = () => T;

class DIContainer {
  private services = new Map<string, Factory<any>>();
  private singletons = new Map<string, any>();

  /**
   * Register a service factory
   * @param key - Service identifier
   * @param factory - Factory function that creates the service
   * @param singleton - Whether to cache the instance (default: true)
   */
  register<T>(key: string, factory: Factory<T>, singleton: boolean = true): void {
    if (singleton) {
      // Store factory and create on first access
      this.services.set(key, () => {
        if (!this.singletons.has(key)) {
          this.singletons.set(key, factory());
        }
        return this.singletons.get(key);
      });
    } else {
      // Always create new instance
      this.services.set(key, factory);
    }
  }

  /**
   * Resolve a service by key
   * @param key - Service identifier
   * @returns Service instance
   */
  resolve<T>(key: string): T {
    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service '${key}' not found. Make sure it's registered.`);
    }
    return factory() as T;
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Clear singleton cache for a specific service
   */
  clearSingleton(key: string): void {
    this.singletons.delete(key);
  }
}

// Export singleton instance
export const container = new DIContainer();

