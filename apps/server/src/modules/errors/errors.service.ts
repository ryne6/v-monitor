import { Injectable, Inject, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaClient, MonitorErrorType } from '@prisma/client';
import { ReportErrorDto, ReportBatchErrorDto } from './dto/report-error.dto';
import { DatabaseConfig } from '../../config/database.config';

@Injectable()
export class ErrorsService {
  private prisma: PrismaClient;

  constructor(
    @Optional() @Inject(CACHE_MANAGER) private cacheManager: Cache | undefined,
    @Optional() private databaseConfig: DatabaseConfig | undefined,
  ) {
    if (this.databaseConfig) {
      this.prisma = this.databaseConfig.getPrismaClient();
    } else {
      // Fallback to env configuration to avoid DI issues blocking startup
      const databaseUrl = process.env.DATABASE_URL;
      this.prisma = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
        log: process.env.NODE_ENV !== 'production' ? ['warn', 'error'] : ['error'],
      });
    }
  }

  /**
   * 上报单个错误
   */
  async reportError(errorData: ReportErrorDto) {
    const error = await this.prisma.error.create({
      data: {
        type: errorData.type,
        message: errorData.message,
        stack: errorData.stack,
        filename: errorData.filename,
        line: errorData.line,
        column: errorData.column,
        timestamp: BigInt(errorData.timestamp),
        url: errorData.url,
        userAgent: errorData.userAgent,
        requestMethod: errorData.requestMethod,
        requestUrl: errorData.requestUrl,
        responseStatus: errorData.responseStatus,
        responseStatusText: errorData.responseStatusText,
        requestDuration: errorData.requestDuration,
        requestType: errorData.requestType,
        requestQuery: errorData.requestQuery,
        requestBody: errorData.requestBody,
        requestHeaders: errorData.requestHeaders,
        responseBody: errorData.responseBody,
        responseHeaders: errorData.responseHeaders,
        metadata: errorData.metadata,
        sessionId: errorData.sessionId,
        userId: errorData.userId,
        projectId: errorData.projectId,
      },
    });
    
    // 更新缓存统计
    await this.updateErrorStats(errorData.type, errorData.projectId);
    
    return error;
  }

  /**
   * 批量上报错误
   */
  async reportBatchErrors(batchData: ReportBatchErrorDto) {
    const errors = await this.prisma.error.createMany({
      data: batchData.errors.map(errorData => ({
        type: errorData.type,
        message: errorData.message,
        stack: errorData.stack,
        filename: errorData.filename,
        line: errorData.line,
        column: errorData.column,
        timestamp: BigInt(errorData.timestamp),
        url: errorData.url,
        userAgent: errorData.userAgent,
        requestMethod: errorData.requestMethod,
        requestUrl: errorData.requestUrl,
        responseStatus: errorData.responseStatus,
        responseStatusText: errorData.responseStatusText,
        requestDuration: errorData.requestDuration,
        requestType: errorData.requestType,
        requestQuery: errorData.requestQuery,
        requestBody: errorData.requestBody,
        requestHeaders: errorData.requestHeaders,
        responseBody: errorData.responseBody,
        responseHeaders: errorData.responseHeaders,
        metadata: errorData.metadata,
        sessionId: errorData.sessionId,
        userId: errorData.userId,
        projectId: errorData.projectId,
      })),
    });
    
    // 更新缓存统计
    for (const error of batchData.errors) {
      await this.updateErrorStats(error.type, error.projectId);
    }
    
    return errors;
  }

  /**
   * 获取错误列表
   */
  async getErrors(options: {
    page?: number;
    limit?: number;
    type?: MonitorErrorType;
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { page = 1, limit = 20, type, projectId, startDate, endDate } = options;
    
    const where: any = {};
    
    if (type) {
      where.type = type;
    }
    
    if (projectId) {
      where.projectId = projectId;
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }
    
    const [total, errors] = await Promise.all([
      this.prisma.error.count({ where }),
      this.prisma.error.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    
    return { errors, total };
  }

  /**
   * 获取错误统计
   */
  async getErrorStats(options: {
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { projectId, startDate, endDate } = options;
    
    // 尝试从缓存获取（可选）
    const cacheKey = `error_stats:${projectId}:${startDate?.toISOString()}:${endDate?.toISOString()}`;
    const cached = await this.cacheManager?.get?.(cacheKey);
    if (cached) {
      return cached as any;
    }
    
    const where: any = {};
    
    if (projectId) {
      where.projectId = projectId;
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }
    
    // 总数
    const total = await this.prisma.error.count({ where });
    
    // 按类型统计
    const byTypeResult = await this.prisma.error.groupBy({
      by: ['type'],
      where,
      _count: {
        type: true,
      },
    });
    
    const byType = byTypeResult.reduce((acc, item) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {} as Record<MonitorErrorType, number>);
    
    // 按小时统计（原生 SQL）
    const byHourResult = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT DATE_TRUNC('hour', "createdAt") as hour, COUNT(*) as count
       FROM "errors"
       ${projectId ? 'WHERE "projectId" = $1' : ''}
       ${startDate && endDate ? (projectId ? 'AND' : 'WHERE') + ' "createdAt" BETWEEN $2 AND $3' : ''}
       GROUP BY hour
       ORDER BY hour ASC`,
      ...(projectId ? [projectId] : []),
      ...(startDate && endDate ? [startDate, endDate] : []),
    );
    
    const byHour = (byHourResult || []).reduce((acc, item) => {
      acc[item.hour] = parseInt(item.count, 10);
      return acc;
    }, {} as Record<string, number>);
    
    // 按URL统计
    const byUrlResult = await this.prisma.error.groupBy({
      by: ['url'],
      where,
      _count: { url: true },
      orderBy: { _count: { url: 'desc' } },
      take: 10,
    });
    
    const byUrl = byUrlResult.reduce((acc, item) => {
      acc[item.url] = item._count.url;
      return acc;
    }, {} as Record<string, number>);
    
    const stats = { total, byType, byHour, byUrl };
    
    // 缓存结果（5分钟）（可选）
    await this.cacheManager?.set?.(cacheKey, stats, 300);
    
    return stats;
  }

  /**
   * 更新错误统计缓存（可选）
   */
  private async updateErrorStats(type: MonitorErrorType, projectId?: string): Promise<void> {
    const cacheKey = `error_stats:${projectId}:*`;
    const keys = (await (this.cacheManager as any)?.store?.keys?.(cacheKey)) || [];
    if (Array.isArray(keys) && keys.length > 0) {
      await Promise.all(keys.map((key: string) => this.cacheManager?.del?.(key)));
    }
  }

  /**
   * 删除错误记录
   */
  async deleteError(id: string): Promise<void> {
    await this.prisma.error.delete({ where: { id } });
  }

  /**
   * 清理过期错误记录
   */
  async cleanupOldErrors(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await this.prisma.error.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });
    
    return result.count;
  }
}
