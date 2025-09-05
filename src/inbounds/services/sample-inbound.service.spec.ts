import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { SampleInboundService } from './sample-inbound.service';

describe('SampleInboundService', () => {
  let service: SampleInboundService;
  let mockQueue: jest.Mocked<Queue>;
  let addSpy: jest.SpyInstance;

  beforeEach(async () => {
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
          provide: getQueueToken('INBOUNDS/SAMPLE_INBOUND/v2025.09.05'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<SampleInboundService>(SampleInboundService);
    addSpy = jest.spyOn(mockQueue, 'add');
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
      };
      const expectedJobName = 'submit';
      addSpy.mockResolvedValue({} as unknown as Job);

      // Act
      const result = await service.submit();

      // Assert
      expect(addSpy).toHaveBeenCalledTimes(1);
      expect(addSpy).toHaveBeenCalledWith(expectedJobName, expectedJobData);
      expect(result).toBe('OK');
    });

    it('should handle queue add success', async () => {
      // Arrange
      addSpy.mockResolvedValue({
        id: '123',
        name: 'submit',
      } as unknown as Job);

      // Act
      const result = await service.submit();

      // Assert
      expect(result).toBe('OK');
      expect(addSpy).toHaveBeenCalledWith('submit', {
        message: 'hello',
      });
    });

    it('should propagate queue add errors', async () => {
      // Arrange
      const error = new Error('Queue connection failed');
      addSpy.mockRejectedValue(error);

      // Act & Assert
      await expect(service.submit()).rejects.toThrow('Queue connection failed');
      expect(addSpy).toHaveBeenCalledWith('submit', {
        message: 'hello',
      });
    });

    it('should handle queue timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Queue timeout');
      addSpy.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(service.submit()).rejects.toThrow('Queue timeout');
    });

    it('should handle queue add with undefined job data', async () => {
      // Arrange
      addSpy.mockResolvedValue({} as unknown as Job);

      // Act
      const result = await service.submit();

      // Assert
      expect(addSpy).toHaveBeenCalledWith('submit', {
        message: 'hello',
      });
      expect(result).toBe('OK');
    });

    it('should call queue add with correct job name', async () => {
      // Arrange
      addSpy.mockResolvedValue({} as unknown as Job);

      // Act
      await service.submit();

      // Assert
      expect(addSpy).toHaveBeenCalledWith('submit', expect.any(Object));
    });

    it('should return OK string regardless of job result', async () => {
      // Arrange
      addSpy.mockResolvedValue({
        id: '456',
        status: 'completed',
      } as unknown as Job);

      // Act
      const result = await service.submit();

      // Assert
      expect(result).toBe('OK');
    });
  });
});
