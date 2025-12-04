// ================================
// Event Bus
// ================================
// Event-driven architecture using Redis Pub/Sub
// Enables decoupled communication between services

import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import type { ILogger } from '@/lib/logger/logger.interface';
import type { EventName, EventData, EventDataMap } from './event-types';

export interface EventPayload<T extends EventName = EventName> {
  event: T;
  data: EventData<T>;
  id: string;
  timestamp: number;
  source?: string;
}

type EventHandler<T extends EventName = EventName> = (data: EventData<T>) => void | Promise<void>;
type PatternEventHandler = (event: string, data: unknown) => void | Promise<void>;

export class EventBus {
  private redis: Redis;
  private subscribers = new Map<EventName, Set<EventHandler<EventName>>>();
  private patternSubscribers = new Map<string, Set<PatternEventHandler>>();
  private subscriber: Redis | null = null;
  private patternSubscriber: Redis | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(redis: Redis, private logger: ILogger) {
    this.redis = redis;
    // Start automatic cleanup of empty subscriptions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupEmptySubscriptions();
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Publish an event (type-safe)
   */
  async publish<T extends EventName>(
    event: T,
    data: EventData<T>,
    source?: string
  ): Promise<void> {
    const payload: EventPayload<T> = {
      event,
      data,
      id: uuidv4(),
      timestamp: Date.now(),
      source: source || 'api',
    };

    try {
      // Publish to Redis
      await this.redis.publish(`events:${event}`, JSON.stringify(payload));

      // Store in event log (for replay/debugging)
      await this.redis.lpush(`events:log:${event}`, JSON.stringify(payload));
      await this.redis.ltrim(`events:log:${event}`, 0, 999); // Keep last 1000

      // Store in global event log
      await this.redis.lpush('events:log:all', JSON.stringify(payload));
      await this.redis.ltrim('events:log:all', 0, 9999); // Keep last 10000

      this.logger.log(`📤 Event published: ${event} (${payload.id})`);
    } catch (error) {
      this.logger.error(`Error publishing event '${event}':`, error, {
        component: 'EventBus',
        event,
      });
      throw error;
    }
  }

  /**
   * Subscribe to a specific event (type-safe)
   */
  async subscribe<T extends EventName>(
    event: T,
    handler: EventHandler<T>
  ): Promise<() => void> {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());

      // Set up Redis subscription if not already done
      if (!this.subscriber) {
        this.subscriber = this.redis.duplicate();
        await this.subscriber.subscribe(`events:${event}`);

        this.subscriber.on('message', (channel, message) => {
          try {
            const payload: EventPayload = JSON.parse(message);
            const handlers = this.subscribers.get(event as EventName);
            if (handlers) {
              handlers.forEach(h => {
                try {
                  const result = h(payload.data as EventData<typeof event>);
                  if (result instanceof Promise) {
                    result.catch(err => {
                      this.logger.error(`Error in event handler for '${event}':`, err, {
                        component: 'EventBus',
                        event,
                      });
                    });
                  }
                } catch (error) {
                  this.logger.error(`Error in event handler for '${event}':`, error, {
                    component: 'EventBus',
                    event,
                  });
                }
              });
            }
          } catch (error) {
            this.logger.error(`Error parsing event message for '${event}':`, error, {
              component: 'EventBus',
              event,
            });
          }
        });
      } else {
        // Add subscription to existing subscriber
        await this.subscriber.subscribe(`events:${event}`);
      }
    }

    const handlers = this.subscribers.get(event);
    if (!handlers) {
      throw new Error(`No handler set for event: ${event}`);
    }
    handlers.add(handler as EventHandler<EventName>);
    this.logger.log(`📥 Subscribed to event: ${event}`);

    // Return unsubscribe function with error handling
    return () => {
      try {
        const handlers = this.subscribers.get(event);
        handlers?.delete(handler as EventHandler<EventName>);
        if (this.subscribers.get(event)?.size === 0) {
          this.subscribers.delete(event);
          this.subscriber?.unsubscribe(`events:${event}`).catch((err) => {
            this.logger.error(`Error unsubscribing from '${event}':`, err, {
              component: 'EventBus',
              event,
            });
          });
        }
      } catch (error) {
        this.logger.error(`Error in unsubscribe function for '${event}':`, error, {
          component: 'EventBus',
          event,
        });
      }
    };
  }

  /**
   * Subscribe to events matching a pattern
   */
  async subscribePattern(
    pattern: string,
    handler: PatternEventHandler
  ): Promise<() => void> {
    if (!this.patternSubscribers.has(pattern)) {
      this.patternSubscribers.set(pattern, new Set());

      // Set up pattern subscription if not already done
      if (!this.patternSubscriber) {
        this.patternSubscriber = this.redis.duplicate();
        await this.patternSubscriber.psubscribe(`events:${pattern}`);

        this.patternSubscriber.on('pmessage', (pattern, channel, message) => {
          try {
            const event = channel.replace('events:', '');
            const payload: EventPayload = JSON.parse(message);
            const handlers = this.patternSubscribers.get(pattern);
            if (handlers) {
              handlers.forEach(h => {
                try {
                  const result = h(event, payload.data as unknown);
                  if (result instanceof Promise) {
                    result.catch(err => {
                      this.logger.error(`Error in pattern handler for '${pattern}':`, err, {
                        component: 'EventBus',
                        pattern,
                      });
                    });
                  }
                } catch (error) {
                  this.logger.error(`Error in pattern handler for '${pattern}':`, error, {
                    component: 'EventBus',
                    pattern,
                  });
                }
              });
            }
          } catch (error) {
            this.logger.error(`Error parsing pattern event message:`, error, {
              component: 'EventBus',
              pattern,
            });
          }
        });
      } else {
        await this.patternSubscriber.psubscribe(`events:${pattern}`);
      }
    }

    this.patternSubscribers.get(pattern)!.add(handler);
    this.logger.log(`📥 Subscribed to event pattern: ${pattern}`);

    return () => {
      try {
        this.patternSubscribers.get(pattern)?.delete(handler);
        if (this.patternSubscribers.get(pattern)?.size === 0) {
          this.patternSubscribers.delete(pattern);
          this.patternSubscriber?.punsubscribe(`events:${pattern}`).catch((err) => {
            this.logger.error(`Error unsubscribing from pattern '${pattern}':`, err, {
              component: 'EventBus',
              pattern,
            });
          });
        }
      } catch (error) {
        this.logger.error(`Error in pattern unsubscribe function for '${pattern}':`, error, {
          component: 'EventBus',
          pattern,
        });
      }
    };
  }

  /**
   * Get event history for a specific event
   */
  async getEventHistory<T extends EventName>(
    event: T,
    limit: number = 100
  ): Promise<EventPayload<T>[]> {
    try {
      const events = await this.redis.lrange(`events:log:${event}`, 0, limit - 1);
      return events.map(e => JSON.parse(e));
    } catch (error) {
      this.logger.error(`Error getting event history for '${event}':`, error, {
        component: 'EventBus',
        event,
      });
      return [];
    }
  }

  /**
   * Get recent events from all events
   */
  async getRecentEvents(limit: number = 100): Promise<EventPayload<EventName>[]> {
    try {
      const events = await this.redis.lrange('events:log:all', 0, limit - 1);
      return events.map(e => JSON.parse(e));
    } catch (error) {
      this.logger.error('Error getting recent events:', error, {
        component: 'EventBus',
      });
      return [];
    }
  }

  /**
   * Periodic cleanup of empty subscriber sets
   */
  private cleanupEmptySubscriptions(): void {
    let cleaned = 0;
    
    // Clean up empty event subscribers
    for (const [event, handlers] of this.subscribers.entries()) {
      if (handlers.size === 0) {
        this.subscribers.delete(event);
        this.subscriber?.unsubscribe(`events:${event}`).catch((err) => {
          this.logger.error(`Error unsubscribing during cleanup for '${event}':`, err, {
            component: 'EventBus',
            event,
          });
        });
        cleaned++;
      }
    }
    
    // Clean up empty pattern subscribers
    for (const [pattern, handlers] of this.patternSubscribers.entries()) {
      if (handlers.size === 0) {
        this.patternSubscribers.delete(pattern);
        this.patternSubscriber?.punsubscribe(`events:${pattern}`).catch((err) => {
          this.logger.error(`Error unsubscribing pattern during cleanup for '${pattern}':`, err, {
            component: 'EventBus',
            pattern,
          });
        });
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.log(`🧹 Cleaned ${cleaned} empty subscription sets`);
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    try {
      // Stop automatic cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
      
      // Cleanup empty subscriptions first
      this.cleanupEmptySubscriptions();
      
      if (this.subscriber) {
        await this.subscriber.quit();
        this.subscriber = null;
      }
      if (this.patternSubscriber) {
        await this.patternSubscriber.quit();
        this.patternSubscriber = null;
      }
      this.subscribers.clear();
      this.patternSubscribers.clear();
    } catch (error) {
      this.logger.error('Error destroying EventBus:', error, {
        component: 'EventBus',
      });
    }
  }
}

