import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ErrorTypeDto {
  JS = 'JS',
  RESOURCE = 'RESOURCE',
  NETWORK = 'NETWORK',
  PERFORMANCE = 'PERFORMANCE',
}

export class ReportErrorDto {
  @IsEnum(ErrorTypeDto)
  type: ErrorTypeDto;

  @IsString()
  message: string;

  @IsNumber()
  timestamp: number;

  @IsString()
  url: string;

  @IsString()
  userAgent: string;

  @IsOptional()
  @IsString()
  stack?: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsNumber()
  line?: number;

  @IsOptional()
  @IsNumber()
  column?: number;

  @IsOptional()
  @IsString()
  requestMethod?: string;

  @IsOptional()
  @IsString()
  requestUrl?: string;

  @IsOptional()
  @IsNumber()
  responseStatus?: number;

  @IsOptional()
  @IsString()
  responseStatusText?: string;

  @IsOptional()
  @IsNumber()
  requestDuration?: number;

  @IsOptional()
  @IsString()
  requestType?: string;

  @IsOptional()
  @IsString()
  requestQuery?: string;

  @IsOptional()
  @IsObject()
  requestBody?: any;

  @IsOptional()
  @IsObject()
  requestHeaders?: Record<string, string>;

  @IsOptional()
  @IsObject()
  responseBody?: any;

  @IsOptional()
  @IsObject()
  responseHeaders?: Record<string, string>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;
}

export class ReportBatchErrorDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportErrorDto)
  errors: ReportErrorDto[];
}
