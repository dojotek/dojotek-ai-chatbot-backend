import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { CachesService } from '../../caches/caches.service';
import { CACHE_CLIENT } from '../../caches/constants';
import { LogsService } from '../../logs/logs.service';
import { SampleInboundService } from './sample-inbound.service';

describe('SampleInboundService', () => {
  let service: SampleInboundService;
  let mockQueue: jest.Mocked<Queue>;
  let mockCachesService: jest.Mocked<CachesService>;
  let mockLogsService: jest.Mocked<LogsService>;
  let addSpy: jest.SpyInstance;
  let setSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Create a mock caches service
    mockCachesService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getClient: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as unknown as jest.Mocked<CachesService>;

    // Create a mock logs service
    mockLogsService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<LogsService>;

    // Create a mock queue with all necessary methods
    mockQueue = {
      add: jest.fn(),
      addBulk: jest.fn(),
      addJob: jest.fn(),
      addRepeatable: jest.fn(),
      addRepeatableByKey: jest.fn(),
      clean: jest.fn(),
      close: jest.fn(),
      count: jest.fn(),
      drain: jest.fn(),
      duplicate: jest.fn(),
      empty: jest.fn(),
      events: jest.fn(),
      getJob: jest.fn(),
      getJobs: jest.fn(),
      getRepeatableJobs: jest.fn(),
      getWaiting: jest.fn(),
      getActive: jest.fn(),
      getCompleted: jest.fn(),
      getFailed: jest.fn(),
      getDelayed: jest.fn(),
      getPaused: jest.fn(),
      isPaused: jest.fn(),
      isRunning: jest.fn(),
      name: 'INBOUNDS/SAMPLE_INBOUND/v2025.09.05',
      obliterate: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
      pause: jest.fn(),
      removeAllListeners: jest.fn(),
      removeListener: jest.fn(),
      removeRepeatable: jest.fn(),
      removeRepeatableByKey: jest.fn(),
      resume: jest.fn(),
      trim: jest.fn(),
      updateDelay: jest.fn(),
      updateRepeatable: jest.fn(),
      waitUntilReady: jest.fn(),
    } as unknown as jest.Mocked<Queue>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SampleInboundService,
        {
          provide: CachesService,
          useValue: mockCachesService,
        },
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
        {
          provide: CACHE_CLIENT,
          useValue: {}, // Mock Redis client
        },
        {
          provide: getQueueToken('INBOUNDS/SAMPLE/v2025.09.05'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<SampleInboundService>(SampleInboundService);
    addSpy = jest.spyOn(mockQueue, 'add');
    setSpy = jest.spyOn(mockCachesService, 'set');
    debugSpy = jest.spyOn(mockLogsService, 'debug');
    logSpy = jest.spyOn(mockLogsService, 'log');
    errorSpy = jest.spyOn(mockLogsService, 'error');
    warnSpy = jest.spyOn(mockLogsService, 'warn');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submit', () => {
    it('should add a job to the queue with correct parameters', async () => {
      // Arrange
      const expectedJobData = {
        message: 'hello',
        timestamp: expect.any(String) as string,
        service: 'sample-inbound',
      };
      const expectedJobName = 'submit';
      mockCachesService.set.mockResolvedValue('OK');
      addSpy.mockResolvedValue({} as Job);

      // Act
      const result = await service.submit();

      // Assert
      expect(debugSpy).toHaveBeenCalledWith(
        'Starting sample inbound submission process',
        'SampleInboundService',
      );
      expect(logSpy).toHaveBeenCalledWith(
        'Setting cache value for sample inbound',
        'SampleInboundService',
      );
      expect(setSpy).toHaveBeenCalledWith(
        'INBOUNDS/SAMPLE/v2025.09.05',
        'hello',
        60,
      );
      expect(logSpy).toHaveBeenCalledWith(
        'Adding job to queue for processing',
        'SampleInboundService',
      );
      expect(addSpy).toHaveBeenCalledTimes(1);
      expect(addSpy).toHaveBeenCalledWith(expectedJobName, expectedJobData);
      expect(logSpy).toHaveBeenCalledWith(
        'Sample inbound submission completed successfully',
        'SampleInboundService',
      );
      expect(result).toBe('OK');
    });

    it('should handle queue add success', async () => {
      // Arrange
      mockCachesService.set.mockResolvedValue('OK');
      addSpy.mockResolvedValue({
        id: '123',
        name: 'submit',
      } as Job);

      // Act
      const result = await service.submit();

      // Assert
      expect(setSpy).toHaveBeenCalledWith(
        'INBOUNDS/SAMPLE/v2025.09.05',
        'hello',
        60,
      );
      expect(result).toBe('OK');
      expect(addSpy).toHaveBeenCalledWith('submit', {
        message: 'hello',
        timestamp: expect.any(String) as string,
        service: 'sample-inbound',
      });
    });

    it('should propagate queue add errors', async () => {
      // Arrange
      mockCachesService.set.mockResolvedValue('OK');
      const error = new Error('Queue connection failed');
      addSpy.mockRejectedValue(error);

      // Act & Assert
      await expect(service.submit()).rejects.toThrow('Queue connection failed');
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to submit sample inbound request',
        error.stack,
        'SampleInboundService',
      );
      expect(setSpy).toHaveBeenCalledWith(
        'INBOUNDS/SAMPLE/v2025.09.05',
        'hello',
        60,
      );
      expect(addSpy).toHaveBeenCalledWith('submit', {
        message: 'hello',
        timestamp: expect.any(String) as string,
        service: 'sample-inbound',
      });
    });

    it('should handle queue timeout errors', async () => {
      // Arrange
      mockCachesService.set.mockResolvedValue('OK');
      const timeoutError = new Error('Queue timeout');
      addSpy.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(service.submit()).rejects.toThrow('Queue timeout');
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to submit sample inbound request',
        timeoutError.stack,
        'SampleInboundService',
      );
      expect(setSpy).toHaveBeenCalledWith(
        'INBOUNDS/SAMPLE/v2025.09.05',
        'hello',
        60,
      );
    });

    it('should handle queue add with undefined job data', async () => {
      // Arrange
      mockCachesService.set.mockResolvedValue('OK');
      addSpy.mockResolvedValue({} as Job);

      // Act
      const result = await service.submit();

      // Assert
      expect(setSpy).toHaveBeenCalledWith(
        'INBOUNDS/SAMPLE/v2025.09.05',
        'hello',
        60,
      );
      expect(addSpy).toHaveBeenCalledWith('submit', {
        message: 'hello',
        timestamp: expect.any(String) as string,
        service: 'sample-inbound',
      });
      expect(result).toBe('OK');
    });

    it('should call queue add with correct job name', async () => {
      // Arrange
      mockCachesService.set.mockResolvedValue('OK');
      addSpy.mockResolvedValue({} as Job);

      // Act
      await service.submit();

      // Assert
      expect(setSpy).toHaveBeenCalledWith(
        'INBOUNDS/SAMPLE/v2025.09.05',
        'hello',
        60,
      );
      expect(addSpy).toHaveBeenCalledWith(
        'submit',
        expect.objectContaining({
          message: 'hello',
          timestamp: expect.any(String) as string,
          service: 'sample-inbound',
        }),
      );
    });

    it('should return OK string regardless of job result', async () => {
      // Arrange
      mockCachesService.set.mockResolvedValue('OK');
      addSpy.mockResolvedValue({
        id: '456',
        status: 'completed',
      } as unknown as Job);

      // Act
      const result = await service.submit();

      // Assert
      expect(setSpy).toHaveBeenCalledWith(
        'INBOUNDS/SAMPLE/v2025.09.05',
        'hello',
        60,
      );
      expect(result).toBe('OK');
    });

    it('should call caches service with correct parameters', async () => {
      // Arrange
      mockCachesService.set.mockResolvedValue('OK');
      addSpy.mockResolvedValue({} as Job);

      // Act
      await service.submit();

      // Assert
      expect(setSpy).toHaveBeenCalledWith(
        'INBOUNDS/SAMPLE/v2025.09.05',
        'hello',
        60,
      );
    });

    it('should propagate caches service errors', async () => {
      // Arrange
      const cacheError = new Error('Cache connection failed');
      mockCachesService.set.mockRejectedValue(cacheError);

      // Act & Assert
      await expect(service.submit()).rejects.toThrow('Cache connection failed');
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to submit sample inbound request',
        cacheError.stack,
        'SampleInboundService',
      );
      expect(setSpy).toHaveBeenCalledWith(
        'INBOUNDS/SAMPLE/v2025.09.05',
        'hello',
        60,
      );
      expect(addSpy).not.toHaveBeenCalled();
    });
  });

  describe('simulateWarning', () => {
    it('should log warning message and return confirmation', () => {
      // Act
      const result = service.simulateWarning();

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        'This is a sample warning message for demonstration',
        'SampleInboundService',
      );
      expect(result).toBe('Warning logged');
    });
  });

  describe('simulateError', () => {
    it('should log error message and return confirmation', () => {
      // Act
      const result = service.simulateError();

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        'This is a sample error message for demonstration',
        'Error stack trace would go here',
        'SampleInboundService',
      );
      expect(result).toBe('Error logged');
    });
  });

  describe('simulateDebug', () => {
    it('should log debug message and return confirmation', () => {
      // Act
      const result = service.simulateDebug();

      // Assert
      expect(debugSpy).toHaveBeenCalledWith(
        'This is a sample debug message for demonstration',
        'SampleInboundService',
      );
      expect(result).toBe('Debug logged');
    });
  });
});
