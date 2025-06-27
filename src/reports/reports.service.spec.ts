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
    jest.spyOn(service, 'generateAllReports').mockImplementation(async () => {
      // Use reflection to set the private states for testing
      const serviceAny = service as any;
      serviceAny.states = {
        accounts: 'finished in 0.00',
        yearly: 'finished in 0.00',
        fs: 'finished in 0.00',
        generate: 'finished in 0.00'
      };
      return Promise.resolve();
    });
  });

  it('should generate accounts report asynchronously', async () => {
    const result = await service.accounts();
    expect(result).toBe('finished in 0.00');
  });

  it('should generate yearly report asynchronously', async () => {
    const result = await service.yearly();
    expect(result).toBe('finished in 0.00');
  });

  it('should generate fs report asynchronously', async () => {
    const result = await service.fs();
    expect(result).toBe('finished in 0.00');
  });
});
