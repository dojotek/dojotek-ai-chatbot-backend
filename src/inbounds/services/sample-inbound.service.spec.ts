import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { CachesService } from '../../caches/caches.service';
import { CACHE_CLIENT } from '../../caches/constants';
import { LogsService } from '../../logs/logs.service';
import { ChatSessionsService } from '../../chat-sessions/chat-sessions.service';
import { ChatMessagesService } from '../../chat-messages/chat-messages.service';
import { ConfigsService } from '../../configs/configs.service';
import { ChatAgentsService } from '../../chat-agents/chat-agents.service';
import { CustomersService } from '../../customers/customers.service';
import { CustomerStaffsService } from '../../customer-staffs/customer-staffs.service';
import { SampleInboundService } from './sample-inbound.service';
import { SubmitDto } from '../dto/submit.dto';

describe('SampleInboundService', () => {
  let service: SampleInboundService;
  let mockQueue: jest.Mocked<Queue>;
  let mockNewQueue: jest.Mocked<Queue>;
  let mockCachesService: jest.Mocked<CachesService>;
  let mockLogsService: jest.Mocked<LogsService>;
  let mockChatSessionsService: jest.Mocked<ChatSessionsService>;
  let mockChatMessagesService: jest.Mocked<ChatMessagesService>;
  let mockConfigsService: jest.Mocked<ConfigsService>;
  let mockChatAgentsService: jest.Mocked<ChatAgentsService>;
  let mockCustomersService: jest.Mocked<CustomersService>;
  let mockCustomerStaffsService: jest.Mocked<CustomerStaffsService>;
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

    // Create mock services for validation
    mockChatSessionsService = {
      getInboundChatSessionId: jest.fn(),
    } as unknown as jest.Mocked<ChatSessionsService>;

    mockChatMessagesService = {
      create: jest.fn(),
    } as unknown as jest.Mocked<ChatMessagesService>;

    mockConfigsService = {
      inboundChatDeduplicationTtlSample: 300,
    } as unknown as jest.Mocked<ConfigsService>;

    mockChatAgentsService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ChatAgentsService>;

    mockCustomersService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<CustomersService>;

    mockCustomerStaffsService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<CustomerStaffsService>;

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

    // Create a second mock queue for the new queue
    mockNewQueue = {
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
      emit: jest.fn(),
      eventNames: jest.fn(),
      getActiveCount: jest.fn(),
      getCompletedCount: jest.fn(),
      getDelayedCount: jest.fn(),
      getFailedCount: jest.fn(),
      getJob: jest.fn(),
      getJobCounts: jest.fn(),
      getJobs: jest.fn(),
      getMaxListeners: jest.fn(),
      getName: jest.fn(),
      getQueueEvents: jest.fn(),
      getRepeatableJobs: jest.fn(),
      getWaitingChildrenCount: jest.fn(),
      getWaitingCount: jest.fn(),
      getWorker: jest.fn(),
      isPaused: jest.fn(),
      listenerCount: jest.fn(),
      listeners: jest.fn(),
      obliterate: jest.fn(),
      off: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      pause: jest.fn(),
      prependListener: jest.fn(),
      prependOnceListener: jest.fn(),
      rawListeners: jest.fn(),
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
          provide: ChatSessionsService,
          useValue: mockChatSessionsService,
        },
        {
          provide: ChatMessagesService,
          useValue: mockChatMessagesService,
        },
        {
          provide: ConfigsService,
          useValue: mockConfigsService,
        },
        {
          provide: ChatAgentsService,
          useValue: mockChatAgentsService,
        },
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
        {
          provide: CustomerStaffsService,
          useValue: mockCustomerStaffsService,
        },
        {
          provide: getQueueToken('inbounds/sample/v2025.09.05'),
          useValue: mockQueue,
        },
        {
          provide: getQueueToken('inbounds/sample'),
          useValue: mockNewQueue,
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
      const result = await service.sampleSubmit();

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
        'inbounds/sample/v2025.09.05',
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
      const result = await service.sampleSubmit();

      // Assert
      expect(setSpy).toHaveBeenCalledWith(
        'inbounds/sample/v2025.09.05',
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
      await expect(service.sampleSubmit()).rejects.toThrow(
        'Queue connection failed',
      );
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to submit sample inbound request',
        error.stack,
        'SampleInboundService',
      );
      expect(setSpy).toHaveBeenCalledWith(
        'inbounds/sample/v2025.09.05',
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
      await expect(service.sampleSubmit()).rejects.toThrow('Queue timeout');
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to submit sample inbound request',
        timeoutError.stack,
        'SampleInboundService',
      );
      expect(setSpy).toHaveBeenCalledWith(
        'inbounds/sample/v2025.09.05',
        'hello',
        60,
      );
    });

    it('should handle queue add with undefined job data', async () => {
      // Arrange
      mockCachesService.set.mockResolvedValue('OK');
      addSpy.mockResolvedValue({} as Job);

      // Act
      const result = await service.sampleSubmit();

      // Assert
      expect(setSpy).toHaveBeenCalledWith(
        'inbounds/sample/v2025.09.05',
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
      await service.sampleSubmit();

      // Assert
      expect(setSpy).toHaveBeenCalledWith(
        'inbounds/sample/v2025.09.05',
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
      const result = await service.sampleSubmit();

      // Assert
      expect(setSpy).toHaveBeenCalledWith(
        'inbounds/sample/v2025.09.05',
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
      await service.sampleSubmit();

      // Assert
      expect(setSpy).toHaveBeenCalledWith(
        'inbounds/sample/v2025.09.05',
        'hello',
        60,
      );
    });

    it('should propagate caches service errors', async () => {
      // Arrange
      const cacheError = new Error('Cache connection failed');
      mockCachesService.set.mockRejectedValue(cacheError);

      // Act & Assert
      await expect(service.sampleSubmit()).rejects.toThrow(
        'Cache connection failed',
      );
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to submit sample inbound request',
        cacheError.stack,
        'SampleInboundService',
      );
      expect(setSpy).toHaveBeenCalledWith(
        'inbounds/sample/v2025.09.05',
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

  describe('generateDeduplicationKey', () => {
    // Helper function to access private method
    const generateKey = (
      chatAgentId: string,
      customerId: string,
      customerStaffId: string,
      platform: string,
      message: string,
    ): string => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
      return (service as any).generateDeduplicationKey(
        chatAgentId,
        customerId,
        customerStaffId,
        platform,
        message,
      );
    };

    it('should generate different keys for different messages', () => {
      const baseParams: [string, string, string, string] = [
        'agent-123',
        'customer-123',
        'staff-123',
        'slack',
      ];

      const key1 = generateKey(...baseParams, 'Hello world');
      const key2 = generateKey(...baseParams, 'Hello world!');
      const key3 = generateKey(...baseParams, 'Different message');

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it('should generate same key for identical messages', () => {
      const baseParams: [string, string, string, string] = [
        'agent-123',
        'customer-123',
        'staff-123',
        'slack',
      ];
      const message = 'Hello world';

      const key1 = generateKey(...baseParams, message);
      const key2 = generateKey(...baseParams, message);

      expect(key1).toBe(key2);
    });

    it('should include all parameters in the key', () => {
      const key = generateKey(
        'agent-123',
        'customer-123',
        'staff-123',
        'slack',
        'Hello',
      );

      expect(key).toContain('agent-123');
      expect(key).toContain('customer-123');
      expect(key).toContain('staff-123');
      expect(key).toContain('slack');
      expect(key).toMatch(
        /^inbound:dedup:agent-123:customer-123:staff-123:slack:[a-f0-9]{16}$/,
      );
    });

    it('should generate different keys for different agents', () => {
      const message = 'Same message';
      const key1 = generateKey(
        'agent-123',
        'customer-123',
        'staff-123',
        'slack',
        message,
      );
      const key2 = generateKey(
        'agent-456',
        'customer-123',
        'staff-123',
        'slack',
        message,
      );

      expect(key1).not.toBe(key2);
    });

    it('should handle empty and special characters in messages', () => {
      const baseParams: [string, string, string, string] = [
        'agent-123',
        'customer-123',
        'staff-123',
        'slack',
      ];

      const key1 = generateKey(...baseParams, '');
      const key2 = generateKey(
        ...baseParams,
        'Message with émojiś 🎉 and spëcial chars!@#$%^&*()',
      );
      const key3 = generateKey(
        ...baseParams,
        'Message\nwith\nnewlines\tand\ttabs',
      );

      expect(key1).toMatch(
        /^inbound:dedup:agent-123:customer-123:staff-123:slack:[a-f0-9]{16}$/,
      );
      expect(key2).toMatch(
        /^inbound:dedup:agent-123:customer-123:staff-123:slack:[a-f0-9]{16}$/,
      );
      expect(key3).toMatch(
        /^inbound:dedup:agent-123:customer-123:staff-123:slack:[a-f0-9]{16}$/,
      );

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });
  });

  describe('submit with validation', () => {
    const validSubmitDto: SubmitDto = {
      chatAgentId: 'agent-id-123',
      customerId: 'customer-id-123',
      customerStaffId: 'staff-id-123',
      platform: 'slack',
      message: 'Hello, I need help',
    };

    it('should return error when chat agent is not found', async () => {
      // Arrange
      const findOneSpy = jest.spyOn(mockChatAgentsService, 'findOne');
      findOneSpy.mockResolvedValue(null);

      // Act
      const result = await service.submit(validSubmitDto);

      // Assert
      expect(findOneSpy).toHaveBeenCalledWith({
        id: 'agent-id-123',
      });
      expect(errorSpy).toHaveBeenCalledWith(
        'Chat agent not found with ID: agent-id-123',
        'Chat agent validation failed',
        'SampleInboundService',
      );
      expect(result).toEqual({
        status: 'error',
        message: 'Chat agent not found',
        code: 'CHAT_AGENT_NOT_FOUND',
      });
    });

    it('should return error when customer is not found', async () => {
      // Arrange
      const chatAgentFindOneSpy = jest.spyOn(mockChatAgentsService, 'findOne');
      const customerFindOneSpy = jest.spyOn(mockCustomersService, 'findOne');

      chatAgentFindOneSpy.mockResolvedValue({
        id: 'agent-id-123',
        name: 'Test Agent',
        customerId: 'customer-id-123',
        description: null,
        systemPrompt: 'Test prompt',
        config: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      customerFindOneSpy.mockResolvedValue(null);

      // Act
      const result = await service.submit(validSubmitDto);

      // Assert
      expect(chatAgentFindOneSpy).toHaveBeenCalledWith({
        id: 'agent-id-123',
      });
      expect(customerFindOneSpy).toHaveBeenCalledWith({
        id: 'customer-id-123',
      });
      expect(errorSpy).toHaveBeenCalledWith(
        'Customer not found with ID: customer-id-123',
        'Customer validation failed',
        'SampleInboundService',
      );
      expect(result).toEqual({
        status: 'error',
        message: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND',
      });
    });

    it('should return error when customer staff is not found', async () => {
      // Arrange
      const chatAgentFindOneSpy = jest.spyOn(mockChatAgentsService, 'findOne');
      const customerFindOneSpy = jest.spyOn(mockCustomersService, 'findOne');
      const customerStaffFindOneSpy = jest.spyOn(
        mockCustomerStaffsService,
        'findOne',
      );

      chatAgentFindOneSpy.mockResolvedValue({
        id: 'agent-id-123',
        name: 'Test Agent',
        customerId: 'customer-id-123',
        description: null,
        systemPrompt: 'Test prompt',
        config: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      customerFindOneSpy.mockResolvedValue({
        id: 'customer-id-123',
        name: 'Test Customer',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        email: null,
        phone: null,
        address: null,
        industry: null,
      });
      customerStaffFindOneSpy.mockResolvedValue(null);

      // Act
      const result = await service.submit(validSubmitDto);

      // Assert
      expect(chatAgentFindOneSpy).toHaveBeenCalledWith({
        id: 'agent-id-123',
      });
      expect(customerFindOneSpy).toHaveBeenCalledWith({
        id: 'customer-id-123',
      });
      expect(customerStaffFindOneSpy).toHaveBeenCalledWith({
        id: 'staff-id-123',
      });
      expect(errorSpy).toHaveBeenCalledWith(
        'Customer staff not found with ID: staff-id-123',
        'Customer staff validation failed',
        'SampleInboundService',
      );
      expect(result).toEqual({
        status: 'error',
        message: 'Customer staff not found',
        code: 'CUSTOMER_STAFF_NOT_FOUND',
      });
    });

    it('should proceed with processing when all entities are found', async () => {
      // Arrange
      const chatAgentFindOneSpy = jest.spyOn(mockChatAgentsService, 'findOne');
      const customerFindOneSpy = jest.spyOn(mockCustomersService, 'findOne');
      const customerStaffFindOneSpy = jest.spyOn(
        mockCustomerStaffsService,
        'findOne',
      );
      const createMessageSpy = jest.spyOn(mockChatMessagesService, 'create');

      chatAgentFindOneSpy.mockResolvedValue({
        id: 'agent-id-123',
        name: 'Test Agent',
        customerId: 'customer-id-123',
        description: null,
        systemPrompt: 'Test prompt',
        config: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      customerFindOneSpy.mockResolvedValue({
        id: 'customer-id-123',
        name: 'Test Customer',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        email: null,
        phone: null,
        address: null,
        industry: null,
      });
      customerStaffFindOneSpy.mockResolvedValue({
        id: 'staff-id-123',
        name: 'Test Staff',
        customerId: 'customer-id-123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        email: null,
        phone: null,
        department: null,
        position: null,
      });
      mockCachesService.get.mockResolvedValue(null); // No duplicate
      mockCachesService.set.mockResolvedValue('OK');
      mockChatSessionsService.getInboundChatSessionId.mockResolvedValue(
        'session-id-123',
      );
      createMessageSpy.mockResolvedValue({
        id: 'message-id-123',
        createdAt: new Date(),
        chatSessionId: 'session-id-123',
        messageType: 'user',
        content: 'Hello, I need help',
        metadata: {},
        platformMessageId: null,
      });
      mockNewQueue.add.mockResolvedValue({} as Job);

      // Act
      const result = await service.submit(validSubmitDto);

      // Assert
      expect(chatAgentFindOneSpy).toHaveBeenCalledWith({
        id: 'agent-id-123',
      });
      expect(customerFindOneSpy).toHaveBeenCalledWith({
        id: 'customer-id-123',
      });
      expect(customerStaffFindOneSpy).toHaveBeenCalledWith({
        id: 'staff-id-123',
      });
      expect(logSpy).toHaveBeenCalledWith(
        'All entities validated successfully',
        'SampleInboundService',
      );
      expect(result).toEqual({
        status: 'success',
        chatAgentId: 'agent-id-123',
        chatSessionId: 'session-id-123',
        chatMessageId: 'message-id-123',
        message: 'Message processed successfully',
      });
    });
  });
});
