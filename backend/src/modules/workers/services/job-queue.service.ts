import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retry';

export interface Job<T = Record<string, unknown>> {
  id: string;
  topic: string;
  payload: T;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: unknown;
  priority: number;
  delayUntil?: Date;
}

export interface JobOptions {
  maxAttempts?: number;
  priority?: number;
  delayMs?: number;
}

export type JobHandler<T = Record<string, unknown>> = (job: Job<T>) => Promise<unknown>;

@Injectable()
export class JobQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobQueueService.name);
  private readonly emitter = new EventEmitter();
  private readonly jobs = new Map<string, Job>();
  private readonly handlers = new Map<string, JobHandler>();
  private processingInterval?: NodeJS.Timeout;
  private isProcessing = false;

  // Configuration
  private readonly processIntervalMs = 1000; // Check for jobs every second
  private readonly concurrency = 5; // Max concurrent jobs
  private activeJobs = 0;

  onModuleInit() {
    this.startProcessing();
  }

  onModuleDestroy() {
    this.stopProcessing();
  }

  /**
   * Register a handler for a topic
   */
  registerHandler<T = Record<string, unknown>>(topic: string, handler: JobHandler<T>): void {
    this.handlers.set(topic, handler as JobHandler);
    this.logger.log(`Registered handler for topic: ${topic}`);
  }

  /**
   * Enqueue a new job
   */
  async enqueue<T = Record<string, unknown>>(
    topic: string,
    payload: T,
    options: JobOptions = {},
  ): Promise<Job<T>> {
    const job: Job<T> = {
      id: this.generateJobId(),
      topic,
      payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 3,
      createdAt: new Date(),
      priority: options.priority ?? 0,
      delayUntil: options.delayMs ? new Date(Date.now() + options.delayMs) : undefined,
    };

    this.jobs.set(job.id, job as Job);
    this.logger.debug(`Enqueued job ${job.id} for topic ${topic}`);

    this.emitter.emit('job:enqueued', job);

    return job;
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs for a topic
   */
  getJobsByTopic(topic: string): Job[] {
    return Array.from(this.jobs.values()).filter((job) => job.topic === topic);
  }

  /**
   * Get pending jobs count
   */
  getPendingCount(topic?: string): number {
    let jobs = Array.from(this.jobs.values()).filter((j) => j.status === 'pending');
    if (topic) {
      jobs = jobs.filter((j) => j.topic === topic);
    }
    return jobs.length;
  }

  /**
   * Subscribe to job events
   */
  on(event: 'job:enqueued' | 'job:started' | 'job:completed' | 'job:failed', listener: (job: Job) => void): void {
    this.emitter.on(event, listener);
  }

  /**
   * Start processing jobs
   */
  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(() => this.processJobs(), this.processIntervalMs);
    this.logger.log('Job queue processing started');
  }

  /**
   * Stop processing jobs
   */
  private stopProcessing(): void {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.logger.log('Job queue processing stopped');
  }

  /**
   * Process pending jobs
   */
  private async processJobs(): Promise<void> {
    if (this.activeJobs >= this.concurrency) {
      return;
    }

    const now = new Date();
    const pendingJobs = Array.from(this.jobs.values())
      .filter((job) => {
        if (job.status !== 'pending' && job.status !== 'retry') return false;
        if (job.delayUntil && job.delayUntil > now) return false;
        return true;
      })
      .sort((a, b) => {
        // Higher priority first, then oldest first
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, this.concurrency - this.activeJobs);

    for (const job of pendingJobs) {
      this.processJob(job);
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.topic);

    if (!handler) {
      this.logger.warn(`No handler registered for topic: ${job.topic}`);
      return;
    }

    job.status = 'processing';
    job.startedAt = new Date();
    job.attempts++;
    this.activeJobs++;

    this.emitter.emit('job:started', job);
    this.logger.debug(`Processing job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);

    try {
      const result = await handler(job);
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;

      this.emitter.emit('job:completed', job);
      this.logger.debug(`Job ${job.id} completed successfully`);

      // Clean up completed jobs after a delay
      setTimeout(() => this.cleanupJob(job.id), 60000);
    } catch (error) {
      job.error = error instanceof Error ? error.message : String(error);

      if (job.attempts < job.maxAttempts) {
        job.status = 'retry';
        job.delayUntil = new Date(Date.now() + this.calculateBackoff(job.attempts));
        this.logger.warn(`Job ${job.id} failed, will retry (${job.attempts}/${job.maxAttempts}): ${job.error}`);
      } else {
        job.status = 'failed';
        job.completedAt = new Date();
        this.emitter.emit('job:failed', job);
        this.logger.error(`Job ${job.id} failed permanently: ${job.error}`);
      }
    } finally {
      this.activeJobs--;
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 1 minute
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    // Add some jitter
    return delay + Math.random() * 1000;
  }

  /**
   * Clean up a job from memory
   */
  private cleanupJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job && (job.status === 'completed' || job.status === 'failed')) {
      this.jobs.delete(jobId);
    }
  }

  /**
   * Generate a unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    byTopic: Record<string, number>;
  } {
    const jobs = Array.from(this.jobs.values());
    const byTopic: Record<string, number> = {};

    for (const job of jobs) {
      byTopic[job.topic] = (byTopic[job.topic] || 0) + 1;
    }

    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === 'pending' || j.status === 'retry').length,
      processing: jobs.filter((j) => j.status === 'processing').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      byTopic,
    };
  }
}
