import { IsEnum, IsString, IsNumber, IsOptional, IsObject, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MonitorErrorType } from '@prisma/client';

export class ReportErrorDto {
  @ApiProperty({ enum: MonitorErrorType, description: '错误类型' })
  @IsEnum(MonitorErrorType)
  type: MonitorErrorType;

  @ApiProperty({ description: '错误消息' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: '错误堆栈' })
  @IsOptional()
  @IsString()
  stack?: string;

  @ApiPropertyOptional({ description: '文件名' })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional({ description: '行号' })
  @IsOptional()
  @IsNumber()
  line?: number;

  @ApiPropertyOptional({ description: '列号' })
  @IsOptional()
  @IsNumber()
  column?: number;

  @ApiProperty({ description: '时间戳' })
  @IsNumber()
  timestamp: number;

  @ApiProperty({ description: '页面URL' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: '用户代理' })
  @IsString()
  userAgent: string;

  // 网络请求相关字段
  @ApiPropertyOptional({ description: '请求方法' })
  @IsOptional()
  @IsString()
  requestMethod?: string;

  @ApiPropertyOptional({ description: '请求URL' })
  @IsOptional()
  @IsUrl()
  requestUrl?: string;

  @ApiPropertyOptional({ description: '响应状态码' })
  @IsOptional()
  @IsNumber()
  responseStatus?: number;

  @ApiPropertyOptional({ description: '响应状态文本' })
  @IsOptional()
  @IsString()
  responseStatusText?: string;

  @ApiPropertyOptional({ description: '请求持续时间' })
  @IsOptional()
  @IsNumber()
  requestDuration?: number;

  @ApiPropertyOptional({ description: '请求类型' })
  @IsOptional()
  @IsString()
  requestType?: 'fetch' | 'xhr';

  @ApiPropertyOptional({ description: '请求查询参数' })
  @IsOptional()
  @IsString()
  requestQuery?: string;

  @ApiPropertyOptional({ description: '请求体' })
  @IsOptional()
  @IsObject()
  requestBody?: any;

  @ApiPropertyOptional({ description: '请求头' })
  @IsOptional()
  @IsObject()
  requestHeaders?: Record<string, string>;

  @ApiPropertyOptional({ description: '响应体' })
  @IsOptional()
  @IsObject()
  responseBody?: any;

  @ApiPropertyOptional({ description: '响应头' })
  @IsOptional()
  @IsObject()
  responseHeaders?: Record<string, string>;

  // 扩展字段
  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  // 会话信息
  @ApiPropertyOptional({ description: '会话ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '项目ID' })
  @IsOptional()
  @IsString()
  projectId?: string;
}

export class ReportBatchErrorDto {
  @ApiProperty({ type: [ReportErrorDto], description: '错误列表' })
  @ValidateNested({ each: true })
  @Type(() => ReportErrorDto)
  errors: ReportErrorDto[];
}
