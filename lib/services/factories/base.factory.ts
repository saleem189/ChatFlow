// ================================
// Base Service Factory
// ================================
// Abstract base class for service factories
// Provides common functionality for runtime service selection

import { ConfigService } from '@/lib/config/config.service';
import type { ILogger } from '@/lib/logger/logger.interface';

export interface ServiceFactoryConfig {
  provider?: string;
  [key: string]: unknown;
}

/**
 * Base factory class for service factories
 */
export abstract class BaseServiceFactory<T> {
  protected providers = new Map<string, (config: ServiceFactoryConfig) => T | Promise<T>>();
  protected defaultProvider: string;
  private logger: ILogger | null = null;

  constructor(defaultProvider: string) {
    this.defaultProvider = defaultProvider;
  }

  /**
   * Get logger from DI (lazy load to avoid circular dependencies)
   */
  private async getLogger(): Promise<ILogger> {
    if (this.logger) return this.logger;
    try {
      const { getService } = await import('@/lib/di');
      this.logger = await getService<ILogger>('logger');
      return this.logger;
    } catch (error) {
      // Fallback to console if DI not available (shouldn't happen in production)
      return {
        log: (...args: unknown[]) => console.log(...args),
        info: () => {},
        warn: () => {},
        error: (...args: unknown[]) => console.error(...args),
        performance: () => {},
      } as ILogger;
    }
  }

  /**
   * Register a provider implementation
   */
  async register(name: string, factory: (config: ServiceFactoryConfig) => T | Promise<T>): Promise<void> {
    this.providers.set(name, factory);
    const logger = await this.getLogger();
    logger.log(`✅ Registered ${this.getServiceType()} provider: ${name}`);
  }

  /**
   * Create service instance based on configuration
   */
  async create(config?: ServiceFactoryConfig): Promise<T> {
    const configService = await this.getConfigService();
    
    // Get provider name from config, config service, or environment
    const providerName = config?.provider || 
      await this.getProviderFromConfig(configService) || 
      process.env[this.getEnvVarName()] || 
      this.defaultProvider;

    // Get provider-specific configuration
    const providerConfig = config || 
      await this.getProviderConfig(configService, providerName) || 
      {};

    // Get factory
    const factory = this.providers.get(providerName);
    if (!factory) {
      const available = Array.from(this.providers.keys()).join(', ');
      throw new Error(
        `${this.getServiceType()} provider '${providerName}' not registered. ` +
        `Available providers: ${available}`
      );
    }

    // Create instance
    try {
      const instance = await factory(providerConfig);
      const logger = await this.getLogger();
      logger.log(`✅ Created ${this.getServiceType()} service with provider: ${providerName}`);
      return instance;
    } catch (error: unknown) {
      const logger = await this.getLogger();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error creating ${this.getServiceType()} service with provider '${providerName}':`, error instanceof Error ? error : new Error(errorMessage), {
        component: 'BaseServiceFactory',
        serviceType: this.getServiceType(),
        provider: providerName,
      });
      throw error;
    }
  }

  /**
   * Get list of registered providers
   */
  getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  isProviderRegistered(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Abstract methods to be implemented by subclasses
   */
  protected abstract getServiceType(): string;
  protected abstract getEnvVarName(): string;
  protected abstract getConfigKey(): string;

  /**
   * Get config service (lazy import to avoid circular dependencies)
   */
  private async getConfigService(): Promise<ConfigService | null> {
    try {
      const { getService } = await import('@/lib/di');
      return await getService<ConfigService>('configService');
    } catch (error) {
      // ConfigService not available, return null (will use defaults)
      return null;
    }
  }

  /**
   * Get provider name from config service
   */
  private async getProviderFromConfig(configService: ConfigService | null): Promise<string | null> {
    if (!configService) return null;
    try {
      const value = await configService.get<string>(this.getConfigKey(), undefined);
      return value ?? null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get provider-specific configuration
   */
  private async getProviderConfig(
    configService: ConfigService | null,
    providerName: string
  ): Promise<ServiceFactoryConfig> {
    if (!configService) return {};
    try {
      return await configService.get(`${this.getConfigKey()}.providers.${providerName}`, {});
    } catch (error) {
      return {};
    }
  }
}

