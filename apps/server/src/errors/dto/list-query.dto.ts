import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum ErrorTypeQueryDto {
  JS = 'JS',
  RESOURCE = 'RESOURCE',
  NETWORK = 'NETWORK',
  PERFORMANCE = 'PERFORMANCE',
}

export class ListErrorsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsEnum(ErrorTypeQueryDto)
  type?: ErrorTypeQueryDto;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
