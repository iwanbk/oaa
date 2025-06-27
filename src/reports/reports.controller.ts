import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('api/v1/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  report() {
    return {
      'accounts.csv': this.reportsService.state('accounts'),
      'yearly.csv': this.reportsService.state('yearly'),
      'fs.csv': this.reportsService.state('fs'),
    };
  }

  @Post()
  @HttpCode(201)
  generate() {
    // Use the optimized method that processes all reports in a single file read operation
    this.reportsService.generateAllReports();
    return {
      accounts: this.reportsService.state('accounts'),
      yearly: this.reportsService.state('yearly'),
      fs: this.reportsService.state('fs'),
    };
  }
}
