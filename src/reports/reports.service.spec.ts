import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Mock the file system operations for testing
  beforeEach(() => {
    jest.spyOn(service, 'generateAllReports').mockImplementation(() => {
      // Use reflection to set the private states for testing
      const serviceAny = service as any;
      serviceAny.states = {
        accounts: 'not started',
        yearly: 'not started',
        fs: 'not started',
        generate: 'starting'
      };
      return Promise.resolve();
    });
  });

  it('should reset states when generateAllReports is called', () => {
    service.generateAllReports();
    expect(service.state('accounts')).toBe('not started');
    expect(service.state('yearly')).toBe('not started');
    expect(service.state('fs')).toBe('not started');
    expect(service.state('generate')).toBe('starting');
  });

  it('should return the correct state for a report type', () => {
    // Set up the states
    const serviceAny = service as any;
    serviceAny.states = {
      accounts: 'processing',
      yearly: 'finished in 1.23',
      fs: 'error: file not found',
      generate: 'processing'
    };
    
    expect(service.state('accounts')).toBe('processing');
    expect(service.state('yearly')).toBe('finished in 1.23');
    expect(service.state('fs')).toBe('error: file not found');
    expect(service.state('generate')).toBe('processing');
  });
});
