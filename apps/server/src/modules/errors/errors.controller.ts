import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ErrorsService } from './errors.service';
import { ReportErrorDto, ReportBatchErrorDto } from './dto/report-error.dto';
import { MonitorErrorType } from '@prisma/client';

@ApiTags('errors')
@Controller('errors')
export class ErrorsController {
  constructor(private readonly errorsService: ErrorsService) {}

  @Post('report')
  @ApiOperation({ summary: '上报单个错误' })
  @ApiResponse({ status: 201, description: '错误上报成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async reportError(@Body() errorData: ReportErrorDto) {
    return this.errorsService.reportError(errorData);
  }

  @Post('report/batch')
  @ApiOperation({ summary: '批量上报错误' })
  @ApiResponse({ status: 201, description: '批量错误上报成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async reportBatchErrors(@Body() batchData: ReportBatchErrorDto) {
    return this.errorsService.reportBatchErrors(batchData);
  }

  @Get()
  @ApiOperation({ summary: '获取错误列表' })
  @ApiQuery({ name: 'page', required: false, description: '页码', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', type: Number })
  @ApiQuery({ name: 'type', required: false, enum: MonitorErrorType, description: '错误类型' })
  @ApiQuery({ name: 'projectId', required: false, description: '项目ID' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getErrors(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: MonitorErrorType,
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const options = {
      page,
      limit,
      type,
      projectId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };
    
    return this.errorsService.getErrors(options);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取错误统计' })
  @ApiQuery({ name: 'projectId', required: false, description: '项目ID' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getErrorStats(
    @Query('projectId') projectId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const options = {
      projectId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };
    
    return this.errorsService.getErrorStats(options);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除错误记录' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 404, description: '错误记录不存在' })
  async deleteError(@Param('id') id: string): Promise<void> {
    await this.errorsService.deleteError(id);
  }

  @Post('cleanup')
  @ApiOperation({ summary: '清理过期错误记录' })
  @ApiQuery({ name: 'daysToKeep', required: false, description: '保留天数', type: Number })
  @ApiResponse({ status: 200, description: '清理完成' })
  async cleanupOldErrors(@Query('daysToKeep') daysToKeep?: number) {
    const deletedCount = await this.errorsService.cleanupOldErrors(daysToKeep);
    return { deletedCount };
  }
}
