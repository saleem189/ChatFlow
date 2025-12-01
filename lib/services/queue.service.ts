// ================================
// In-Memory Queue Service
// ================================
// Simple in-memory queue for push notifications with retry logic

interface QueueJob {
    id: string;
    type: 'push-notification';
    payload: {
        userId: string;
        notification: {
            title: string;
            body: string;
            url?: string;
            icon?: string;
        };
    };
    attempts: number;
    maxAttempts: number;
    nextRetryAt: Date;
    createdAt: Date;
}

class InMemoryQueue {
    private queue: Map<string, QueueJob> = new Map();
    private processing: Set<string> = new Set();
    private workerInterval: NodeJS.Timeout | null = null;

    /**
     * Add a job to the queue
     */
    async add(
        type: 'push-notification',
        payload: QueueJob['payload'],
        options: { attempts?: number; delay?: number } = {}
    ): Promise<string> {
        const jobId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const job: QueueJob = {
            id: jobId,
            type,
            payload,
            attempts: 0,
            maxAttempts: options.attempts || 3,
            nextRetryAt: new Date(Date.now() + (options.delay || 0)),
            createdAt: new Date(),
        };

        this.queue.set(jobId, job);
        console.log(`📥 Queue: Added job ${jobId}`);

        return jobId;
    }

    /**
     * Process a single job
     */
    private async processJob(job: QueueJob, processor: (job: QueueJob) => Promise<void>): Promise<boolean> {
        try {
            console.log(`⚙️ Queue: Processing job ${job.id} (attempt ${job.attempts + 1}/${job.maxAttempts})`);

            await processor(job);

            // Job succeeded - remove from queue
            this.queue.delete(job.id);
            this.processing.delete(job.id);
            console.log(`✅ Queue: Job ${job.id} completed successfully`);

            return true;
        } catch (error) {
            console.error(`❌ Queue: Job ${job.id} failed:`, error);

            job.attempts++;

            if (job.attempts >= job.maxAttempts) {
                // Max attempts reached - remove from queue
                console.log(`🚫 Queue: Job ${job.id} failed after ${job.maxAttempts} attempts - removing`);
                this.queue.delete(job.id);
                this.processing.delete(job.id);
                return false;
            }

            // Schedule retry with exponential backoff
            const backoffDelay = Math.min(1000 * Math.pow(2, job.attempts), 30000); // Max 30s
            job.nextRetryAt = new Date(Date.now() + backoffDelay);
            this.processing.delete(job.id);

            console.log(`🔄 Queue: Job ${job.id} will retry in ${backoffDelay}ms`);

            return false;
        }
    }

    /**
     * Start the queue worker
     */
    startWorker(processor: (job: QueueJob) => Promise<void>, intervalMs: number = 1000): void {
        if (this.workerInterval) {
            console.log('⚠️ Queue: Worker already running');
            return;
        }

        console.log('🚀 Queue: Starting worker...');

        this.workerInterval = setInterval(async () => {
            const now = new Date();

            // Find jobs ready to process
            const jobsToProcess = Array.from(this.queue.values()).filter(
                (job) => !this.processing.has(job.id) && job.nextRetryAt <= now
            );

            if (jobsToProcess.length > 0) {
                console.log(`📋 Queue: Found ${jobsToProcess.length} jobs to process`);
            }

            // Process jobs in parallel (with concurrency limit)
            const concurrency = 5;
            for (let i = 0; i < jobsToProcess.length; i += concurrency) {
                const batch = jobsToProcess.slice(i, i + concurrency);

                await Promise.all(
                    batch.map(async (job) => {
                        this.processing.add(job.id);
                        await this.processJob(job, processor);
                    })
                );
            }
        }, intervalMs);
    }

    /**
     * Stop the queue worker
     */
    stopWorker(): void {
        if (this.workerInterval) {
            clearInterval(this.workerInterval);
            this.workerInterval = null;
            console.log('🛑 Queue: Worker stopped');
        }
    }

    /**
     * Get queue stats
     */
    getStats(): { total: number; processing: number; pending: number } {
        return {
            total: this.queue.size,
            processing: this.processing.size,
            pending: this.queue.size - this.processing.size,
        };
    }

    /**
     * Clear all jobs
     */
    clear(): void {
        this.queue.clear();
        this.processing.clear();
        console.log('🗑️ Queue: Cleared all jobs');
    }
}

// Export singleton instance
export const notificationQueue = new InMemoryQueue();

// Export types
export type { QueueJob };
