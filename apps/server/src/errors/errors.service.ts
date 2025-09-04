import { Injectable } from '@nestjs/common';
import { PrismaClient, MonitorErrorType } from '@prisma/client';
import { ReportBatchErrorDto, ReportErrorDto } from './dto/report-error.dto';

@Injectable()
export class ErrorsService {
  private prisma = new PrismaClient();

  private normalizeType(t: unknown): MonitorErrorType | undefined {
    if (!t) return undefined;
    const u = String(t).toUpperCase();
    if (
      u === 'JS' ||
      u === 'RESOURCE' ||
      u === 'NETWORK' ||
      u === 'PERFORMANCE'
    )
      return u as MonitorErrorType;
    return undefined;
  }

  async create(data: ReportErrorDto) {
    const item = await this.prisma.error.create({
      data: {
        type: this.normalizeType((data as any).type)!,
        message: data.message,
        stack: data.stack,
        filename: data.filename,
        line: data.line,
        column: data.column,
        timestamp: BigInt(data.timestamp),
        url: data.url,
        userAgent: data.userAgent,
        requestMethod: data.requestMethod,
        requestUrl: data.requestUrl,
        responseStatus: data.responseStatus,
        responseStatusText: data.responseStatusText,
        requestDuration: data.requestDuration,
        requestType: data.requestType,
        requestQuery: data.requestQuery,
        requestBody: data.requestBody as any,
        requestHeaders: (data.requestHeaders as any) ?? undefined,
        responseBody: data.responseBody as any,
        responseHeaders: (data.responseHeaders as any) ?? undefined,
        metadata: (data.metadata as any) ?? undefined,
        sessionId: data.sessionId,
        userId: data.userId,
        projectId: data.projectId,
        version: (data as any).version,
      },
    });
    return item;
  }

  async createBatch(dto: ReportBatchErrorDto) {
    const items = dto.errors ?? [];
    if (!items.length) return [];
    const result = await this.prisma.error.createMany({
      data: items.map((data) => ({
        type: this.normalizeType((data as any).type)!,
        message: data.message,
        stack: data.stack,
        filename: data.filename,
        line: data.line,
        column: data.column,
        timestamp: BigInt(data.timestamp),
        url: data.url,
        userAgent: data.userAgent,
        requestMethod: data.requestMethod,
        requestUrl: data.requestUrl,
        responseStatus: data.responseStatus,
        responseStatusText: data.responseStatusText,
        requestDuration: data.requestDuration,
        requestType: data.requestType,
        requestQuery: data.requestQuery,
        requestBody: data.requestBody as any,
        requestHeaders: (data.requestHeaders as any) ?? undefined,
        responseBody: data.responseBody as any,
        responseHeaders: (data.responseHeaders as any) ?? undefined,
        metadata: (data.metadata as any) ?? undefined,
        sessionId: data.sessionId,
        userId: data.userId,
        projectId: data.projectId,
        version: (data as any).version,
      })),
    });
    return result;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    type?: string;
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: any = {};
    if (query.type) where.type = this.normalizeType(query.type);
    if (query.projectId) where.projectId = query.projectId;
    if (query.startDate && query.endDate)
      where.createdAt = { gte: query.startDate, lte: query.endDate };

    const [total, errors] = await Promise.all([
      this.prisma.error.count({ where }),
      this.prisma.error.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { total, errors };
  }

  async stats(query?: {
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};
    if (query?.projectId) where.projectId = query.projectId;
    if (query?.startDate && query?.endDate)
      where.createdAt = { gte: query.startDate, lte: query.endDate };

    const total = await this.prisma.error.count({ where });

    const byTypeRows = await this.prisma.error.groupBy({
      by: ['type'],
      where,
      _count: { _all: true },
    });
    const byType = byTypeRows.reduce(
      (acc, r) => {
        acc[r.type] = r._count._all;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byHourRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT DATE_TRUNC('hour', "createdAt") as hour, COUNT(*)::int as count
       FROM "Error"
       ${query?.projectId ? 'WHERE "projectId" = $1' : ''}
       ${query?.startDate && query?.endDate ? (query?.projectId ? 'AND' : 'WHERE') + ' "createdAt" BETWEEN $2 AND $3' : ''}
       GROUP BY hour
       ORDER BY hour ASC`,
      ...(query?.projectId ? [query.projectId] : []),
      ...(query?.startDate && query?.endDate
        ? [query.startDate, query.endDate]
        : []),
    );
    const byHour = (byHourRows || []).reduce(
      (acc, r) => {
        acc[r.hour] = Number(r.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    const byUrlRaw = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT "url", COUNT(*)::int as count
       FROM "Error"
       ${query?.projectId ? 'WHERE "projectId" = $1' : ''}
       ${query?.startDate && query?.endDate ? (query?.projectId ? 'AND' : 'WHERE') + ' "createdAt" BETWEEN $2 AND $3' : ''}
       GROUP BY "url"
       ORDER BY count DESC
       LIMIT 10`,
      ...(query?.projectId ? [query.projectId] : []),
      ...(query?.startDate && query?.endDate
        ? [query.startDate, query.endDate]
        : []),
    );
    const byUrl = (byUrlRaw || []).reduce(
      (acc, r) => {
        acc[r.url] = Number(r.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    return { total, byType, byHour, byUrl };
  }

  async remove(id: string) {
    await this.prisma.error.delete({ where: { id } });
  }
}
