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
  Logger,
} from '@nestjs/common';
import { ErrorsService } from './errors.service';
import { ReportBatchErrorDto, ReportErrorDto } from './dto/report-error.dto';
import { ListErrorsQueryDto } from './dto/list-query.dto';

@Controller('errors')
export class ErrorsController {
  private readonly logger = new Logger(ErrorsController.name);
  constructor(private readonly errorsService: ErrorsService) {}

  @Post('report')
  report(@Body() body: ReportErrorDto) {
    this.logger.log('report called');
    return this.errorsService.create(body);
  }

  @Post('report/batch')
  reportBatch(@Body() body: ReportBatchErrorDto) {
    this.logger.log('reportBatch called');
    return this.errorsService.createBatch(body);
  }

  @Get()
  list(@Query() q: ListErrorsQueryDto) {
    this.logger.log(`list called page=${q.page} limit=${q.limit}`);
    return this.errorsService.findAll({
      page: q.page,
      limit: q.limit,
      type: q.type,
      projectId: q.projectId,
      startDate: q.startDate ? new Date(q.startDate) : undefined,
      endDate: q.endDate ? new Date(q.endDate) : undefined,
    });
  }

  @Get('stats')
  stats(@Query() q: ListErrorsQueryDto) {
    this.logger.log('stats called');
    return this.errorsService.stats({
      projectId: q.projectId,
      startDate: q.startDate ? new Date(q.startDate) : undefined,
      endDate: q.endDate ? new Date(q.endDate) : undefined,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    this.logger.log(`remove called id=${id}`);
    this.errorsService.remove(id);
  }

  @Get('error')
  get() {
    throw new Error('test');
  }
}
