// ==============================================================================
// ARCHIVO: shared/queue/queue.service.ts
// FUNCIONALIDAD: Sistema de colas con Redis para procesamiento asíncrono
// - Job scheduling y processing
// - Retry logic con backoff exponencial
// - Dead letter queue para jobs fallidos
// - Priorización de jobs
// - Métricas de procesamiento
// ==============================================================================

import Redis from 'ioredis';
import { getRedisConfig } from '../cache/redis.config';

export interface QueueJob<T = any> {
  id: string;
  type: string;
  data: T;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  processAt?: number;
}

export interface QueueOptions {
  maxAttempts?: number;
  retryDelay?: number; // ms
  priority?: number; // 1-10, mayor = más prioridad
  delay?: number; // ms para delayed jobs
}

export type JobHandler<T = any> = (data: T) => Promise<void>;

export class QueueService {
  private redis: Redis;
  private subscriber: Redis;
  private serviceName: string;
  private handlers: Map<string, JobHandler> = new Map();
  private processing = false;
  private metrics = {
    processed: 0,
    failed: 0,
    retried: 0,
  };

  // Queues keys
  private readonly QUEUE_PREFIX = 'queue:';
  private readonly PROCESSING_PREFIX = 'processing:';
  private readonly DELAYED_PREFIX = 'delayed:';
  private readonly DEAD_LETTER_PREFIX = 'dlq:';

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    const config = getRedisConfig(serviceName);

    this.redis = new Redis(config);
    this.subscriber = new Redis(config);

    this.redis.on('connect', () => {
      console.log(`[${serviceName}] ✅ Queue Redis connected`);
    });
  }

  /**
   * Agregar un job a la cola
   */
  async add<T>(
    type: string,
    data: T,
    options: QueueOptions = {}
  ): Promise<string> {
    const job: QueueJob<T> = {
      id: `${type}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      type,
      data,
      priority: options.priority || 5,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: Date.now(),
      processAt: options.delay ? Date.now() + options.delay : undefined,
    };

    const serialized = JSON.stringify(job);

    if (job.processAt) {
      // Delayed job
      await this.redis.zadd(
        `${this.DELAYED_PREFIX}${type}`,
        job.processAt,
        serialized
      );
    } else {
      // Immediate job con prioridad
      await this.redis.zadd(
        `${this.QUEUE_PREFIX}${type}`,
        -job.priority, // Negativo para que mayor prioridad = primero
        serialized
      );
    }

    // Notificar a workers
    await this.redis.publish(`queue:new:${type}`, job.id);

    return job.id;
  }

  /**
   * Registrar un handler para un tipo de job
   */
  registerHandler<T>(type: string, handler: JobHandler<T>): void {
    this.handlers.set(type, handler as JobHandler);
    console.log(`[${this.serviceName}] ✅ Registered handler for: ${type}`);
  }

  /**
   * Iniciar procesamiento de jobs
   */
  async start(): Promise<void> {
    if (this.processing) {
      console.log(`[${this.serviceName}] Queue already processing`);
      return;
    }

    this.processing = true;
    console.log(`[${this.serviceName}] 🚀 Queue processing started`);

    // Procesar delayed jobs periódicamente
    setInterval(() => this.processDelayedJobs(), 1000);

    // Procesar cola principal
    this.processQueue();
  }

  /**
   * Detener procesamiento de jobs
   */
  async stop(): Promise<void> {
    this.processing = false;
    console.log(`[${this.serviceName}] ⏸️  Queue processing stopped`);
  }

  /**
   * Procesar cola principal
   */
  private async processQueue(): Promise<void> {
    while (this.processing) {
      try {
        // Obtener todos los tipos de queue registrados
        for (const type of this.handlers.keys()) {
          const queueKey = `${this.QUEUE_PREFIX}${type}`;

          // Pop job con mayor prioridad
          const results = await this.redis.zpopmin(queueKey, 1);

          if (results && results.length >= 2) {
            const serialized = results[0];
            const job: QueueJob = JSON.parse(serialized as string);

            await this.processJob(job);
          }
        }

        // Pequeño delay para no saturar CPU
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[${this.serviceName}] Queue processing error:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Procesar delayed jobs que ya están listos
   */
  private async processDelayedJobs(): Promise<void> {
    for (const type of this.handlers.keys()) {
      const delayedKey = `${this.DELAYED_PREFIX}${type}`;
      const now = Date.now();

      // Obtener jobs que ya deben procesarse
      const results = await this.redis.zrangebyscore(
        delayedKey,
        '-inf',
        now,
        'LIMIT',
        0,
        10 // Procesar hasta 10 a la vez
      );

      for (const serialized of results) {
        const job: QueueJob = JSON.parse(serialized);

        // Mover a cola principal
        await this.redis.zrem(delayedKey, serialized);
        await this.redis.zadd(
          `${this.QUEUE_PREFIX}${type}`,
          -job.priority,
          serialized
        );
      }
    }
  }

  /**
   * Procesar un job individual
   */
  private async processJob(job: QueueJob): Promise<void> {
    const handler = this.handlers.get(job.type);

    if (!handler) {
      console.error(`[${this.serviceName}] No handler for job type: ${job.type}`);
      return;
    }

    // Marcar como en procesamiento
    const processingKey = `${this.PROCESSING_PREFIX}${job.id}`;
    await this.redis.setex(processingKey, 3600, JSON.stringify(job));

    try {
      // Ejecutar handler
      await handler(job.data);

      // Job exitoso
      this.metrics.processed++;
      await this.redis.del(processingKey);

      console.log(
        `[${this.serviceName}] ✅ Processed job ${job.type}:${job.id} (attempt ${job.attempts + 1})`
      );
    } catch (error) {
      console.error(
        `[${this.serviceName}] ❌ Job failed ${job.type}:${job.id}:`,
        error
      );

      job.attempts++;

      if (job.attempts >= job.maxAttempts) {
        // Mover a dead letter queue
        await this.moveToDeadLetterQueue(job, error);
        this.metrics.failed++;
      } else {
        // Retry con backoff exponencial
        await this.retryJob(job);
        this.metrics.retried++;
      }

      await this.redis.del(processingKey);
    }
  }

  /**
   * Reintentar un job con backoff exponencial
   */
  private async retryJob(job: QueueJob): Promise<void> {
    // Backoff: 1s, 2s, 4s, 8s, etc.
    const delay = Math.pow(2, job.attempts) * 1000;
    job.processAt = Date.now() + delay;

    const serialized = JSON.stringify(job);

    await this.redis.zadd(
      `${this.DELAYED_PREFIX}${job.type}`,
      job.processAt,
      serialized
    );

    console.log(
      `[${this.serviceName}] 🔄 Retrying job ${job.type}:${job.id} in ${delay}ms (attempt ${job.attempts}/${job.maxAttempts})`
    );
  }

  /**
   * Mover job a dead letter queue
   */
  private async moveToDeadLetterQueue(job: QueueJob, error: any): Promise<void> {
    const dlqKey = `${this.DEAD_LETTER_PREFIX}${job.type}`;

    const dlqEntry = {
      job,
      error: {
        message: error.message,
        stack: error.stack,
      },
      failedAt: Date.now(),
    };

    await this.redis.lpush(dlqKey, JSON.stringify(dlqEntry));

    // Mantener solo los últimos 1000 jobs fallidos
    await this.redis.ltrim(dlqKey, 0, 999);

    console.error(
      `[${this.serviceName}] ☠️  Job moved to DLQ: ${job.type}:${job.id} after ${job.attempts} attempts`
    );
  }

  /**
   * Obtener tamaño de la cola
   */
  async getQueueSize(type: string): Promise<number> {
    const queueKey = `${this.QUEUE_PREFIX}${type}`;
    return await this.redis.zcard(queueKey);
  }

  /**
   * Obtener tamaño de delayed queue
   */
  async getDelayedQueueSize(type: string): Promise<number> {
    const delayedKey = `${this.DELAYED_PREFIX}${type}`;
    return await this.redis.zcard(delayedKey);
  }

  /**
   * Obtener dead letter queue
   */
  async getDeadLetterQueue(type: string, limit: number = 100): Promise<any[]> {
    const dlqKey = `${this.DEAD_LETTER_PREFIX}${type}`;
    const items = await this.redis.lrange(dlqKey, 0, limit - 1);
    return items.map(item => JSON.parse(item));
  }

  /**
   * Limpiar dead letter queue
   */
  async clearDeadLetterQueue(type: string): Promise<number> {
    const dlqKey = `${this.DEAD_LETTER_PREFIX}${type}`;
    const size = await this.redis.llen(dlqKey);
    await this.redis.del(dlqKey);
    return size;
  }

  /**
   * Obtener métricas
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Resetear métricas
   */
  resetMetrics() {
    this.metrics = {
      processed: 0,
      failed: 0,
      retried: 0,
    };
  }

  /**
   * Cerrar conexiones
   */
  async close(): Promise<void> {
    this.processing = false;
    await this.redis.quit();
    await this.subscriber.quit();
  }
}
