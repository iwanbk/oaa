import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('api/v1/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) { }

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
    // Get current states before starting background processing
    const currentStates = {
      'accounts.csv': this.reportsService.state('accounts'),
      'yearly.csv': this.reportsService.state('yearly'),
      'fs.csv': this.reportsService.state('fs'),
    };

    // Start background processing
    setTimeout(() => {
      // Run reports sequentially in the background
      this.reportsService.accounts();
      this.reportsService.yearly();
      this.reportsService.fs();
    }, 0);

    // Return immediately with current states
    return {
      message: 'Report generation started in background',
      states: currentStates
    };
  }
}
