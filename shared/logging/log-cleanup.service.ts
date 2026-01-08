// ==============================================================================
// ARCHIVO: shared/logging/log-cleanup.service.ts
// FUNCIONALIDAD: Servicio de limpieza y monitoreo de logs
// - Limpieza manual de logs antiguos
// - Monitoreo de uso de disco
// - Estadísticas de logs
// - Alertas de espacio en disco
// ==============================================================================

import * as fs from 'fs/promises';
import * as path from 'path';
import { LoggerService } from './logger.service';

export interface LogCleanupStats {
  totalFiles: number;
  totalSize: number; // bytes
  oldestFile: string | null;
  newestFile: string | null;
  filesByType: {
    error: number;
    combined: number;
    http: number;
    other: number;
  };
}

export interface CleanupResult {
  filesDeleted: number;
  spaceFree: number; // bytes
  errors: string[];
}

export class LogCleanupService {
  private logger: LoggerService;
  private logsDir: string;

  constructor(logsDir?: string) {
    this.logger = new LoggerService('log-cleanup');
    this.logsDir = logsDir || process.env.LOGS_DIR || path.join(process.cwd(), 'logs');
  }

  /**
   * Obtener estadísticas de logs actuales
   */
  async getLogStats(): Promise<LogCleanupStats> {
    const stats: LogCleanupStats = {
      totalFiles: 0,
      totalSize: 0,
      oldestFile: null,
      newestFile: null,
      filesByType: {
        error: 0,
        combined: 0,
        http: 0,
        other: 0,
      },
    };

    try {
      // Verificar si el directorio existe
      try {
        await fs.access(this.logsDir);
      } catch (error) {
        this.logger.warn('Logs directory does not exist', { logsDir: this.logsDir });
        return stats;
      }

      const files = await fs.readdir(this.logsDir);
      let oldestTime = Infinity;
      let newestTime = 0;

      for (const file of files) {
        const filePath = path.join(this.logsDir, file);
        const fileStat = await fs.stat(filePath);

        if (fileStat.isFile()) {
          stats.totalFiles++;
          stats.totalSize += fileStat.size;

          // Determinar tipo de archivo
          if (file.includes('error')) {
            stats.filesByType.error++;
          } else if (file.includes('combined')) {
            stats.filesByType.combined++;
          } else if (file.includes('http')) {
            stats.filesByType.http++;
          } else {
            stats.filesByType.other++;
          }

          // Rastrear archivos más antiguos y nuevos
          const mtime = fileStat.mtime.getTime();
          if (mtime < oldestTime) {
            oldestTime = mtime;
            stats.oldestFile = file;
          }
          if (mtime > newestTime) {
            newestTime = mtime;
            stats.newestFile = file;
          }
        }
      }

      this.logger.info('Log statistics collected', {
        totalFiles: stats.totalFiles,
        totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2),
      });

      return stats;
    } catch (error) {
      this.logger.error('Error collecting log statistics', error as Error);
      throw error;
    }
  }

  /**
   * Limpiar logs más antiguos que X días
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<CleanupResult> {
    const result: CleanupResult = {
      filesDeleted: 0,
      spaceFreed: 0,
      errors: [],
    };

    if (daysToKeep < 1) {
      throw new Error('daysToKeep must be at least 1');
    }

    this.logger.info('Starting log cleanup', { daysToKeep, logsDir: this.logsDir });

    try {
      const files = await fs.readdir(this.logsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      for (const file of files) {
        try {
          const filePath = path.join(this.logsDir, file);
          const fileStat = await fs.stat(filePath);

          // Solo procesar archivos (no directorios)
          if (fileStat.isFile() && fileStat.mtime < cutoffDate) {
            // Solo eliminar archivos de log (seguridad)
            if (file.endsWith('.log') || file.endsWith('.log.gz')) {
              const fileSize = fileStat.size;
              await fs.unlink(filePath);

              result.filesDeleted++;
              result.spaceFreed += fileSize;

              this.logger.debug('Log file deleted', {
                file,
                age: Math.floor((Date.now() - fileStat.mtime.getTime()) / (1000 * 60 * 60 * 24)),
                sizeMB: (fileSize / 1024 / 1024).toFixed(2),
              });
            }
          }
        } catch (error) {
          const errorMsg = `Failed to delete ${file}: ${(error as Error).message}`;
          result.errors.push(errorMsg);
          this.logger.error('Error deleting log file', error as Error, { file });
        }
      }

      this.logger.info('Log cleanup completed', {
        filesDeleted: result.filesDeleted,
        spaceFreedMB: (result.spaceFreed / 1024 / 1024).toFixed(2),
        errors: result.errors.length,
      });

      return result;
    } catch (error) {
      this.logger.error('Error during log cleanup', error as Error);
      throw error;
    }
  }

  /**
   * Verificar uso de disco y alertar si está alto
   */
  async checkDiskUsage(thresholdMB: number = 500): Promise<{
    totalSizeMB: number;
    exceedsThreshold: boolean;
    message: string;
  }> {
    const stats = await this.getLogStats();
    const totalSizeMB = stats.totalSize / 1024 / 1024;
    const exceedsThreshold = totalSizeMB > thresholdMB;

    const result = {
      totalSizeMB: parseFloat(totalSizeMB.toFixed(2)),
      exceedsThreshold,
      message: exceedsThreshold
        ? `Logs directory is using ${totalSizeMB.toFixed(2)}MB (threshold: ${thresholdMB}MB)`
        : `Logs directory size is within threshold: ${totalSizeMB.toFixed(2)}MB`,
    };

    if (exceedsThreshold) {
      this.logger.warn('Log disk usage exceeds threshold', {
        currentSizeMB: result.totalSizeMB,
        thresholdMB,
        totalFiles: stats.totalFiles,
      });
    }

    return result;
  }

  /**
   * Comprimir logs antiguos (complementa a winston-daily-rotate-file)
   */
  async compressOldLogs(daysBeforeCompression: number = 7): Promise<{
    filesCompressed: number;
    errors: string[];
  }> {
    const result = {
      filesCompressed: 0,
      errors: [] as string[],
    };

    this.logger.info('Starting log compression', { daysBeforeCompression });

    try {
      const files = await fs.readdir(this.logsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBeforeCompression);

      for (const file of files) {
        try {
          // Solo comprimir archivos .log que no estén ya comprimidos
          if (!file.endsWith('.log') || file.endsWith('.gz')) {
            continue;
          }

          const filePath = path.join(this.logsDir, file);
          const fileStat = await fs.stat(filePath);

          if (fileStat.isFile() && fileStat.mtime < cutoffDate) {
            // Nota: Para implementación completa, aquí usarías zlib para comprimir
            // Por ahora solo registramos que deberían comprimirse
            this.logger.debug('File candidate for compression', { file });
            // result.filesCompressed++; // Incrementar cuando se implemente la compresión
          }
        } catch (error) {
          const errorMsg = `Failed to compress ${file}: ${(error as Error).message}`;
          result.errors.push(errorMsg);
          this.logger.error('Error compressing log file', error as Error, { file });
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Error during log compression', error as Error);
      throw error;
    }
  }

  /**
   * Obtener resumen de salud de logs
   */
  async getHealthSummary(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    stats: LogCleanupStats;
    diskUsage: {
      totalSizeMB: number;
      exceedsThreshold: boolean;
    };
    recommendations: string[];
  }> {
    const stats = await this.getLogStats();
    const diskUsage = await this.checkDiskUsage(500); // 500MB threshold
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Evaluar salud
    if (diskUsage.exceedsThreshold) {
      status = 'warning';
      recommendations.push('Consider running manual cleanup of old logs');
    }

    if (diskUsage.totalSizeMB > 1000) {
      status = 'critical';
      recommendations.push('URGENT: Disk usage is very high, cleanup required immediately');
    }

    if (stats.totalFiles > 100) {
      recommendations.push('Large number of log files detected, consider increasing cleanup frequency');
    }

    return {
      status,
      stats,
      diskUsage: {
        totalSizeMB: diskUsage.totalSizeMB,
        exceedsThreshold: diskUsage.exceedsThreshold,
      },
      recommendations,
    };
  }
}
