import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('api/v1/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) { }

  @Get()
  report() {
    // Ensure we return the current states immediately without waiting for any background processes
    // This is a non-blocking operation that simply returns the current state strings
    const currentStates = {
      'accounts.csv': this.reportsService.state('accounts'),
      'yearly.csv': this.reportsService.state('yearly'),
      'fs.csv': this.reportsService.state('fs'),
      generate: this.reportsService.state('generate'),
    };

    return currentStates;
  }

  @Post()
  @HttpCode(201)
  generate() {
    // Reset states and start the report generation in the background without waiting for it to complete
    void this.reportsService.generateAllReports();

    // Return immediately with the current state (which should be 'not started' or 'starting')
    return {
      accounts: this.reportsService.state('accounts'),
      yearly: this.reportsService.state('yearly'),
      fs: this.reportsService.state('fs'),
      generate: this.reportsService.state('generate'),
    };
  }
}
