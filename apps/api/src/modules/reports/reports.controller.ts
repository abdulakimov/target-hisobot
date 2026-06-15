import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { ReportFormOptions, ReportResponse, TestSendResponse } from '@hisobotchi/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(@CurrentUser() user: User): Promise<ReportResponse[]> {
    return this.reports.findAll(user.id);
  }

  // Declared before :id so "options" isn't captured as an id param.
  @Get('options')
  options(@CurrentUser() user: User): Promise<ReportFormOptions> {
    return this.reports.getFormOptions(user.id);
  }

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: User, @Body() dto: CreateReportDto): Promise<ReportResponse> {
    return this.reports.create(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id') id: string): Promise<ReportResponse> {
    return this.reports.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
  ): Promise<ReportResponse> {
    return this.reports.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: User, @Param('id') id: string): Promise<void> {
    return this.reports.remove(user.id, id);
  }

  @Post(':id/test-send')
  @HttpCode(200)
  testSend(@CurrentUser() user: User, @Param('id') id: string): Promise<TestSendResponse> {
    return this.reports.testSend(user.id, id);
  }
}
