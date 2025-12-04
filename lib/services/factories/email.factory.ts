// ================================
// Email Service Factory
// ================================
// Factory for creating email providers (AWS SES, SendGrid, Mailgun, etc.)
// Supports runtime provider selection via configuration

import { BaseServiceFactory, type ServiceFactoryConfig } from './base.factory';
import { logger } from '@/lib/logger';

// ================================
// Email Provider Interface
// ================================
export interface EmailParams {
  to: string | string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  messageId: string;
  status: 'sent' | 'failed';
  provider: string;
  timestamp: number;
}

export interface BulkEmailParams {
  emails: EmailParams[];
}

export interface BulkEmailResult {
  sent: number;
  failed: number;
  results: EmailResult[];
}

/**
 * Email provider configuration interfaces
 */
export interface AWSSESConfig {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface SendGridConfig {
  apiKey?: string;
}

export interface MailgunConfig {
  apiKey?: string;
  domain?: string;
}

export type EmailProviderConfig = AWSSESConfig | SendGridConfig | MailgunConfig | ServiceFactoryConfig;

export interface EmailProvider {
  sendEmail(params: EmailParams): Promise<EmailResult>;
  sendBulk(params: BulkEmailParams): Promise<BulkEmailResult>;
  getStatus?(messageId: string): Promise<'sent' | 'delivered' | 'failed' | 'bounced' | 'unknown'>;
}

// ================================
// Mock Email Providers
// ================================

/**
 * Mock AWS SES Provider
 * Returns dummy responses for testing
 */
export class MockAWSSESProvider implements EmailProvider {
  private config: AWSSESConfig;

  constructor(config: AWSSESConfig = {}) {
    this.config = config;
    logger.log('📧 Mock AWS SES Provider initialized');
  }

  async sendEmail(params: EmailParams): Promise<EmailResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const messageId = `mock-ses-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.log(`📧 [MOCK AWS SES] Sending email:`, {
      to: params.to,
      subject: params.subject,
      messageId,
    });

    return {
      messageId,
      status: 'sent',
      provider: 'aws-ses',
      timestamp: Date.now(),
    };
  }

  async sendBulk(params: BulkEmailParams): Promise<BulkEmailResult> {
    const results: EmailResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const email of params.emails) {
      try {
        const result = await this.sendEmail(email);
        results.push(result);
        sent++;
      } catch (error) {
        failed++;
        results.push({
          messageId: `failed-${Date.now()}`,
          status: 'failed',
          provider: 'aws-ses',
          timestamp: Date.now(),
        });
      }
    }

    return { sent, failed, results };
  }

  async getStatus(messageId: string): Promise<'sent' | 'delivered' | 'failed' | 'bounced' | 'unknown'> {
    // Mock: randomly return different statuses
    const statuses: Array<'sent' | 'delivered' | 'failed' | 'bounced' | 'unknown'> = 
      ['sent', 'delivered', 'unknown'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }
}

/**
 * Mock SendGrid Provider
 * Returns dummy responses for testing
 */
export class MockSendGridProvider implements EmailProvider {
  private config: SendGridConfig;

  constructor(config: SendGridConfig = {}) {
    this.config = config;
    logger.log('📧 Mock SendGrid Provider initialized');
  }

  async sendEmail(params: EmailParams): Promise<EmailResult> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const messageId = `mock-sg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.log(`📧 [MOCK SendGrid] Sending email:`, {
      to: params.to,
      subject: params.subject,
      messageId,
    });

    return {
      messageId,
      status: 'sent',
      provider: 'sendgrid',
      timestamp: Date.now(),
    };
  }

  async sendBulk(params: BulkEmailParams): Promise<BulkEmailResult> {
    const results: EmailResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const email of params.emails) {
      try {
        const result = await this.sendEmail(email);
        results.push(result);
        sent++;
      } catch (error) {
        failed++;
        results.push({
          messageId: `failed-${Date.now()}`,
          status: 'failed',
          provider: 'sendgrid',
          timestamp: Date.now(),
        });
      }
    }

    return { sent, failed, results };
  }

  async getStatus(messageId: string): Promise<'sent' | 'delivered' | 'failed' | 'bounced' | 'unknown'> {
    return 'delivered';
  }
}

/**
 * Mock Mailgun Provider
 * Returns dummy responses for testing
 */
export class MockMailgunProvider implements EmailProvider {
  private config: MailgunConfig;

  constructor(config: MailgunConfig = {}) {
    this.config = config;
    logger.log('📧 Mock Mailgun Provider initialized');
  }

  async sendEmail(params: EmailParams): Promise<EmailResult> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const messageId = `mock-mg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.log(`📧 [MOCK Mailgun] Sending email:`, {
      to: params.to,
      subject: params.subject,
      messageId,
    });

    return {
      messageId,
      status: 'sent',
      provider: 'mailgun',
      timestamp: Date.now(),
    };
  }

  async sendBulk(params: BulkEmailParams): Promise<BulkEmailResult> {
    const results: EmailResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const email of params.emails) {
      try {
        const result = await this.sendEmail(email);
        results.push(result);
        sent++;
      } catch (error) {
        failed++;
        results.push({
          messageId: `failed-${Date.now()}`,
          status: 'failed',
          provider: 'mailgun',
          timestamp: Date.now(),
        });
      }
    }

    return { sent, failed, results };
  }

  async getStatus(messageId: string): Promise<'sent' | 'delivered' | 'failed' | 'bounced' | 'unknown'> {
    return 'delivered';
  }
}

// ================================
// Email Service Factory
// ================================
export class EmailServiceFactory extends BaseServiceFactory<EmailProvider> {
  private static instance: EmailServiceFactory | null = null;

  constructor() {
    super('aws-ses'); // Default provider
    
    // Register mock providers
    this.register('aws-ses', (config: ServiceFactoryConfig) => {
      const awsConfig: AWSSESConfig = {
        region: typeof config.region === 'string' ? config.region : undefined,
        accessKeyId: typeof config.accessKeyId === 'string' ? config.accessKeyId : undefined,
        secretAccessKey: typeof config.secretAccessKey === 'string' ? config.secretAccessKey : undefined,
      };
      return new MockAWSSESProvider(awsConfig);
    });
    this.register('sendgrid', (config: ServiceFactoryConfig) => {
      const sgConfig: SendGridConfig = {
        apiKey: typeof config.apiKey === 'string' ? config.apiKey : undefined,
      };
      return new MockSendGridProvider(sgConfig);
    });
    this.register('mailgun', (config: ServiceFactoryConfig) => {
      const mgConfig: MailgunConfig = {
        apiKey: typeof config.apiKey === 'string' ? config.apiKey : undefined,
        domain: typeof config.domain === 'string' ? config.domain : undefined,
      };
      return new MockMailgunProvider(mgConfig);
    });
  }

  protected getServiceType(): string {
    return 'email';
  }

  protected getEnvVarName(): string {
    return 'EMAIL_PROVIDER';
  }

  protected getConfigKey(): string {
    return 'email.provider';
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EmailServiceFactory {
    if (!this.instance) {
      this.instance = new EmailServiceFactory();
    }
    return this.instance;
  }

  /**
   * Register a new email provider
   */
  static registerProvider(name: string, factory: (config: EmailProviderConfig) => EmailProvider): void {
    const instance = this.getInstance();
    instance.register(name, factory);
  }
}

// Export convenience function
export async function createEmailService(config?: ServiceFactoryConfig): Promise<EmailProvider> {
  const factory = EmailServiceFactory.getInstance();
  return await factory.create(config);
}

