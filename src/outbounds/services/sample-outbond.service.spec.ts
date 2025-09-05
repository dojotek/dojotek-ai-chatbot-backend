import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { SampleOutbondService } from './sample-outbond.service';
import { Queue, Job } from 'bullmq';

describe('SampleOutbondService', () => {
  let service: SampleOutbondService;
  let mockQueue: jest.Mocked<Queue>;

  // Helper function to create a mock job
  const createMockJob = (): Job =>
    ({
      id: '1',
      name: 'submit',
      data: { message: 'hello' },
      opts: {},
      progress: jest.fn(),
      updateData: jest.fn(),
      updateProgress: jest.fn(),
      remove: jest.fn(),
      retry: jest.fn(),
      promote: jest.fn(),
      fail: jest.fn(),
      moveToCompleted: jest.fn(),
      moveToFailed: jest.fn(),
      moveToDelayed: jest.fn(),
      moveToWaiting: jest.fn(),
      moveToActive: jest.fn(),
      moveToWaitingChildren: jest.fn(),
      isActive: jest.fn(),
      isCompleted: jest.fn(),
      isFailed: jest.fn(),
      isDelayed: jest.fn(),
      isWaiting: jest.fn(),
      isWaitingChildren: jest.fn(),
      isPaused: jest.fn(),
      isStuck: jest.fn(),
      getState: jest.fn(),
      toJSON: jest.fn(),
      returnvalue: null,
      failedReason: null,
      processedOn: null,
      finishedOn: null,
      timestamp: Date.now(),
      attemptsMade: 0,
      delay: 0,
      priority: 0,
      stacktrace: [],
    }) as unknown as Job;

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
      empty: jest.fn(),
      getJob: jest.fn(),
      getJobs: jest.fn(),
      getJobCounts: jest.fn(),
      getRepeatableJobs: jest.fn(),
      isPaused: jest.fn(),
      isRunning: jest.fn(),
      name: 'test-queue',
      obliterate: jest.fn(),
      pause: jest.fn(),
      removeJobs: jest.fn(),
      removeRepeatable: jest.fn(),
      removeRepeatableByKey: jest.fn(),
      resume: jest.fn(),
      trim: jest.fn(),
      updateRepeatable: jest.fn(),
      waitUntilReady: jest.fn(),
      whenCurrentJobsFinished: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn(),
      setMaxListeners: jest.fn(),
      getMaxListeners: jest.fn(),
      listenerCount: jest.fn(),
      listeners: jest.fn(),
      rawListeners: jest.fn(),
      eventNames: jest.fn(),
      prependListener: jest.fn(),
      prependOnceListener: jest.fn(),
    } as unknown as jest.Mocked<Queue>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SampleOutbondService,
        {
          provide: getQueueToken('OUTBOUNDS/SAMPLE_OUTBOUND/v2025.09.05'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<SampleOutbondService>(SampleOutbondService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should inject the correct queue', () => {
      expect(service).toBeInstanceOf(SampleOutbondService);
    });
  });

  describe('submit', () => {
    it('should add a job to the queue with correct parameters', async () => {
      // Arrange
      const expectedJobData = {
        message: 'hello',
      };
      const expectedJobName = 'submit';
      const mockJob = createMockJob();
      mockQueue.add.mockResolvedValue(mockJob);
      const addSpy = jest.spyOn(mockQueue, 'add');

      // Act
      const result = await service.submit();

      // Assert
      expect(addSpy).toHaveBeenCalledTimes(1);
      expect(addSpy).toHaveBeenCalledWith(expectedJobName, expectedJobData);
      expect(result).toBe('OK');
    });

    it('should return "OK" after successfully adding job to queue', async () => {
      // Arrange
      const mockJob = createMockJob();
      mockQueue.add.mockResolvedValue(mockJob);

      // Act
      const result = await service.submit();

      // Assert
      expect(result).toBe('OK');
    });

    it('should handle queue.add errors and propagate them', async () => {
      // Arrange
      const error = new Error('Queue add failed');
      mockQueue.add.mockRejectedValue(error);
      const addSpy = jest.spyOn(mockQueue, 'add');

      // Act & Assert
      await expect(service.submit()).rejects.toThrow('Queue add failed');
      expect(addSpy).toHaveBeenCalledTimes(1);
    });

    it('should call queue.add with correct job name and data structure', async () => {
      // Arrange
      const mockJob = createMockJob();
      mockQueue.add.mockResolvedValue(mockJob);
      const addSpy = jest.spyOn(mockQueue, 'add');

      // Act
      await service.submit();

      // Assert
      expect(addSpy).toHaveBeenCalledWith(
        'submit',
        expect.objectContaining({
          message: 'hello',
        }),
      );
    });

    it('should maintain consistent job data structure', async () => {
      // Arrange
      const mockJob = createMockJob();
      mockQueue.add.mockResolvedValue(mockJob);
      const addSpy = jest.spyOn(mockQueue, 'add');

      // Act
      await service.submit();

      // Assert
      const callArgs = addSpy.mock.calls[0];
      expect(callArgs[0]).toBe('submit');
      expect(callArgs[1]).toEqual({
        message: 'hello',
      });
      expect(typeof callArgs[1]).toBe('object');
      expect(callArgs[1]).toHaveProperty('message');
    });
  });
});
