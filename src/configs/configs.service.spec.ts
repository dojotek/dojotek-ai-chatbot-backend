import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConfigsService } from './configs.service';

describe('ConfigsService', () => {
  let service: ConfigsService;
  let configService: ConfigService;
  let mockGet: jest.SpyInstance;
  let mockGetOrThrow: jest.SpyInstance;

  beforeEach(async () => {
    // Create a mock ConfigService with proper typing
    const mockConfigService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    } as Pick<ConfigService, 'get' | 'getOrThrow'>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ConfigsService>(ConfigsService);
    configService = module.get<ConfigService>(ConfigService);

    // Create spies for the methods
    mockGet = jest.spyOn(configService, 'get');
    mockGetOrThrow = jest.spyOn(configService, 'getOrThrow');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Basic Configuration Getters', () => {
    describe('port', () => {
      it('should return PORT from config with default 3000', () => {
        mockGet.mockReturnValue(8080);

        const result = service.port;

        expect(mockGet).toHaveBeenCalledWith('PORT', 3000);
        expect(result).toBe(8080);
      });

      it('should return default port when not configured', () => {
        mockGet.mockReturnValue(3000);

        const result = service.port;

        expect(result).toBe(3000);
      });
    });

    describe('nodeEnv', () => {
      it('should return NODE_ENV from config with default development', () => {
        mockGet.mockReturnValue('production');

        const result = service.nodeEnv;

        expect(mockGet).toHaveBeenCalledWith('NODE_ENV', 'development');
        expect(result).toBe('production');
      });

      it('should return default nodeEnv when not configured', () => {
        mockGet.mockReturnValue('development');

        const result = service.nodeEnv;

        expect(result).toBe('development');
      });
    });

    describe('logLevel', () => {
      it('should return LOG_LEVEL from config with default info', () => {
        mockGet.mockReturnValue('debug');

        const result = service.logLevel;

        expect(mockGet).toHaveBeenCalledWith('LOG_LEVEL', 'info');
        expect(result).toBe('debug');
      });

      it('should return default logLevel when not configured', () => {
        mockGet.mockReturnValue('info');

        const result = service.logLevel;

        expect(result).toBe('info');
      });
    });
  });

  describe('Message Queue Configuration', () => {
    describe('messageQueueValkeyHost', () => {
      it('should return MESSAGE_QUEUE_VALKEY_HOST using getOrThrow', () => {
        mockGetOrThrow.mockReturnValue('redis-host');

        const result = service.messageQueueValkeyHost;

        expect(mockGetOrThrow).toHaveBeenCalledWith(
          'MESSAGE_QUEUE_VALKEY_HOST',
        );
        expect(result).toBe('redis-host');
      });

      it('should throw error when MESSAGE_QUEUE_VALKEY_HOST is not set', () => {
        mockGetOrThrow.mockImplementation(() => {
          throw new Error('Configuration value not found');
        });

        expect(() => service.messageQueueValkeyHost).toThrow(
          'Configuration value not found',
        );
      });
    });

    describe('messageQueueValkeyPort', () => {
      it('should return MESSAGE_QUEUE_VALKEY_PORT with default 6380', () => {
        mockGet.mockReturnValue(6381);

        const result = service.messageQueueValkeyPort;

        expect(mockGet).toHaveBeenCalledWith('MESSAGE_QUEUE_VALKEY_PORT', 6380);
        expect(result).toBe(6381);
      });

      it('should return default port when not configured', () => {
        mockGet.mockReturnValue(6380);

        const result = service.messageQueueValkeyPort;

        expect(result).toBe(6380);
      });
    });
  });

  describe('Cache Configuration', () => {
    describe('cacheValkeyHost', () => {
      it('should return CACHE_VALKEY_HOST using getOrThrow', () => {
        mockGetOrThrow.mockReturnValue('cache-host');

        const result = service.cacheValkeyHost;

        expect(mockGetOrThrow).toHaveBeenCalledWith('CACHE_VALKEY_HOST');
        expect(result).toBe('cache-host');
      });

      it('should throw error when CACHE_VALKEY_HOST is not set', () => {
        mockGetOrThrow.mockImplementation(() => {
          throw new Error('Configuration value not found');
        });

        expect(() => service.cacheValkeyHost).toThrow(
          'Configuration value not found',
        );
      });
    });

    describe('cacheValkeyPort', () => {
      it('should return CACHE_VALKEY_PORT with default 6379', () => {
        mockGet.mockReturnValue(6380);

        const result = service.cacheValkeyPort;

        expect(mockGet).toHaveBeenCalledWith('CACHE_VALKEY_PORT', 6379);
        expect(result).toBe(6380);
      });

      it('should return default port when not configured', () => {
        mockGet.mockReturnValue(6379);

        const result = service.cacheValkeyPort;

        expect(result).toBe(6379);
      });
    });
  });

  describe('Helper Methods', () => {
    describe('getRequiredConfig', () => {
      it('should return config value when it exists', () => {
        mockGet.mockReturnValue('test-value');

        const result = service.getRequiredConfig('TEST_KEY');

        expect(mockGet).toHaveBeenCalledWith('TEST_KEY');
        expect(result).toBe('test-value');
      });

      it('should throw error when config value is not set', () => {
        mockGet.mockReturnValue(undefined);

        expect(() => service.getRequiredConfig('TEST_KEY')).toThrow(
          'Required configuration TEST_KEY is not set',
        );
      });

      it('should throw error when config value is empty string', () => {
        mockGet.mockReturnValue('');

        expect(() => service.getRequiredConfig('TEST_KEY')).toThrow(
          'Required configuration TEST_KEY is not set',
        );
      });

      it('should throw error when config value is null', () => {
        mockGet.mockReturnValue(null);

        expect(() => service.getRequiredConfig('TEST_KEY')).toThrow(
          'Required configuration TEST_KEY is not set',
        );
      });
    });

    describe('getConfigWithDefault', () => {
      it('should return config value when it exists', () => {
        mockGet.mockReturnValue('actual-value');

        const result = service.getConfigWithDefault(
          'TEST_KEY',
          'default-value',
        );

        expect(mockGet).toHaveBeenCalledWith('TEST_KEY', 'default-value');
        expect(result).toBe('actual-value');
      });

      it('should return default value when config is not set', () => {
        mockGet.mockReturnValue('default-value');

        const result = service.getConfigWithDefault(
          'TEST_KEY',
          'default-value',
        );

        expect(result).toBe('default-value');
      });

      it('should work with different types', () => {
        mockGet.mockReturnValue(42);

        const result = service.getConfigWithDefault('TEST_KEY', 10);

        expect(mockGet).toHaveBeenCalledWith('TEST_KEY', 10);
        expect(result).toBe(42);
      });
    });
  });

  describe('Cache Prefix and TTL Configuration', () => {
    describe('User cache configuration', () => {
      it('should return cachePrefixUsers with default', () => {
        mockGet.mockReturnValue('custom-users');

        const result = service.cachePrefixUsers;

        expect(mockGet).toHaveBeenCalledWith('CACHE_PREFIX_USERS', 'users');
        expect(result).toBe('custom-users');
      });

      it('should return cacheTtlUsers with default', () => {
        mockGet.mockReturnValue(7200);

        const result = service.cacheTtlUsers;

        expect(mockGet).toHaveBeenCalledWith('CACHE_TTL_USERS', 3600);
        expect(result).toBe(7200);
      });
    });

    describe('Roles cache configuration', () => {
      it('should return cachePrefixRoles with default', () => {
        mockGet.mockReturnValue('custom-roles');

        const result = service.cachePrefixRoles;

        expect(mockGet).toHaveBeenCalledWith('CACHE_PREFIX_ROLES', 'roles');
        expect(result).toBe('custom-roles');
      });

      it('should return cacheTtlRoles with default', () => {
        mockGet.mockReturnValue(7200);

        const result = service.cacheTtlRoles;

        expect(mockGet).toHaveBeenCalledWith('CACHE_TTL_ROLES', 3600);
        expect(result).toBe(7200);
      });
    });

    describe('Knowledges cache configuration', () => {
      it('should return cachePrefixKnowledges with default', () => {
        mockGet.mockReturnValue('custom-knowledges');

        const result = service.cachePrefixKnowledges;

        expect(mockGet).toHaveBeenCalledWith(
          'CACHE_PREFIX_KNOWLEDGES',
          'knowledges',
        );
        expect(result).toBe('custom-knowledges');
      });

      it('should return cacheTtlKnowledges with default', () => {
        mockGet.mockReturnValue(7200);

        const result = service.cacheTtlKnowledges;

        expect(mockGet).toHaveBeenCalledWith('CACHE_TTL_KNOWLEDGES', 3600);
        expect(result).toBe(7200);
      });
    });

    describe('Knowledge Files cache configuration', () => {
      it('should return cachePrefixKnowledgeFiles with default', () => {
        mockGet.mockReturnValue('custom-knowledge-files');

        const result = service.cachePrefixKnowledgeFiles;

        expect(mockGet).toHaveBeenCalledWith(
          'CACHE_PREFIX_KNOWLEDGE_FILES',
          'knowledge-files',
        );
        expect(result).toBe('custom-knowledge-files');
      });

      it('should return cacheTtlKnowledgeFiles with default', () => {
        mockGet.mockReturnValue(7200);

        const result = service.cacheTtlKnowledgeFiles;

        expect(mockGet).toHaveBeenCalledWith('CACHE_TTL_KNOWLEDGE_FILES', 3600);
        expect(result).toBe(7200);
      });
    });

    describe('Customers cache configuration', () => {
      it('should return cachePrefixCustomers with default', () => {
        mockGet.mockReturnValue('custom-customers');

        const result = service.cachePrefixCustomers;

        expect(mockGet).toHaveBeenCalledWith(
          'CACHE_PREFIX_CUSTOMERS',
          'customers',
        );
        expect(result).toBe('custom-customers');
      });

      it('should return cacheTtlCustomers with default', () => {
        mockGet.mockReturnValue(7200);

        const result = service.cacheTtlCustomers;

        expect(mockGet).toHaveBeenCalledWith('CACHE_TTL_CUSTOMERS', 3600);
        expect(result).toBe(7200);
      });
    });

    describe('Customer Staffs cache configuration', () => {
      it('should return cachePrefixCustomerStaffs with default', () => {
        mockGet.mockReturnValue('custom-customer-staffs');

        const result = service.cachePrefixCustomerStaffs;

        expect(mockGet).toHaveBeenCalledWith(
          'CACHE_PREFIX_CUSTOMER_STAFFS',
          'customer-staffs',
        );
        expect(result).toBe('custom-customer-staffs');
      });

      it('should return cacheTtlCustomerStaffs with default', () => {
        mockGet.mockReturnValue(7200);

        const result = service.cacheTtlCustomerStaffs;

        expect(mockGet).toHaveBeenCalledWith('CACHE_TTL_CUSTOMER_STAFFS', 3600);
        expect(result).toBe(7200);
      });
    });

    describe('Chat Agents cache configuration', () => {
      it('should return cachePrefixChatAgents with default', () => {
        mockGet.mockReturnValue('custom-chat-agents');

        const result = service.cachePrefixChatAgents;

        expect(mockGet).toHaveBeenCalledWith(
          'CACHE_PREFIX_CHAT_AGENTS',
          'chat-agents',
        );
        expect(result).toBe('custom-chat-agents');
      });

      it('should return cacheTtlChatAgents with default', () => {
        mockGet.mockReturnValue(7200);

        const result = service.cacheTtlChatAgents;

        expect(mockGet).toHaveBeenCalledWith('CACHE_TTL_CHAT_AGENTS', 3600);
        expect(result).toBe(7200);
      });
    });

    describe('Chat Sessions cache configuration', () => {
      it('should return cachePrefixChatSessions with default', () => {
        mockGet.mockReturnValue('custom-chat-sessions');

        const result = service.cachePrefixChatSessions;

        expect(mockGet).toHaveBeenCalledWith(
          'CACHE_PREFIX_CHAT_SESSIONS',
          'chat-sessions',
        );
        expect(result).toBe('custom-chat-sessions');
      });

      it('should return cacheTtlChatSessions with default', () => {
        mockGet.mockReturnValue(7200);

        const result = service.cacheTtlChatSessions;

        expect(mockGet).toHaveBeenCalledWith('CACHE_TTL_CHAT_SESSIONS', 3600);
        expect(result).toBe(7200);
      });
    });

    describe('Chat Messages cache configuration', () => {
      it('should return cachePrefixChatMessages with default', () => {
        mockGet.mockReturnValue('custom-chat-messages');

        const result = service.cachePrefixChatMessages;

        expect(mockGet).toHaveBeenCalledWith(
          'CACHE_PREFIX_CHAT_MESSAGES',
          'chat-messages',
        );
        expect(result).toBe('custom-chat-messages');
      });

      it('should return cacheTtlChatMessages with default', () => {
        mockGet.mockReturnValue(7200);

        const result = service.cacheTtlChatMessages;

        expect(mockGet).toHaveBeenCalledWith('CACHE_TTL_CHAT_MESSAGES', 3600);
        expect(result).toBe(7200);
      });
    });
  });

  describe('Inbound Chat Deduplication TTL Configuration', () => {
    describe('Sample inbound chat deduplication TTL', () => {
      it('should return inboundChatDeduplicationTtlSample with default', () => {
        mockGet.mockReturnValue(600);

        const result = service.inboundChatDeduplicationTtlSample;

        expect(mockGet).toHaveBeenCalledWith(
          'INBOUND_CHAT_DEDUPLICATION_TTL_SAMPLE',
          300,
        );
        expect(result).toBe(600);
      });

      it('should return default value when not configured', () => {
        mockGet.mockReturnValue(300);

        const result = service.inboundChatDeduplicationTtlSample;

        expect(result).toBe(300);
      });
    });

    describe('Slack inbound chat deduplication TTL', () => {
      it('should return inboundChatDeduplicationTtlSlack with default', () => {
        mockGet.mockReturnValue(600);

        const result = service.inboundChatDeduplicationTtlSlack;

        expect(mockGet).toHaveBeenCalledWith(
          'INBOUND_CHAT_DEDUPLICATION_TTL_SLACK',
          300,
        );
        expect(result).toBe(600);
      });

      it('should return default value when not configured', () => {
        mockGet.mockReturnValue(300);

        const result = service.inboundChatDeduplicationTtlSlack;

        expect(result).toBe(300);
      });
    });

    describe('Lark inbound chat deduplication TTL', () => {
      it('should return inboundChatDeduplicationTtlLark with default', () => {
        mockGet.mockReturnValue(600);

        const result = service.inboundChatDeduplicationTtlLark;

        expect(mockGet).toHaveBeenCalledWith(
          'INBOUND_CHAT_DEDUPLICATION_TTL_LARK',
          300,
        );
        expect(result).toBe(600);
      });

      it('should return default value when not configured', () => {
        mockGet.mockReturnValue(300);

        const result = service.inboundChatDeduplicationTtlLark;

        expect(result).toBe(300);
      });
    });
  });

  describe('Inbound Chat Session TTL Configuration', () => {
    describe('Sample inbound chat session TTL', () => {
      it('should return inboundChatSessionTtlSample with default', () => {
        mockGet.mockReturnValue(7200);

        const result = service.inboundChatSessionTtlSample;

        expect(mockGet).toHaveBeenCalledWith(
          'INBOUND_CHAT_SESSION_TTL_SAMPLE',
          3600,
        );
        expect(result).toBe(7200);
      });

      it('should return default value when not configured', () => {
        mockGet.mockReturnValue(3600);

        const result = service.inboundChatSessionTtlSample;

        expect(result).toBe(3600);
      });
    });

    describe('Slack inbound chat session TTL', () => {
      it('should return inboundChatSessionTtlSlack with default', () => {
        mockGet.mockReturnValue(7200);

        const result = service.inboundChatSessionTtlSlack;

        expect(mockGet).toHaveBeenCalledWith(
          'INBOUND_CHAT_SESSION_TTL_SLACK',
          3600,
        );
        expect(result).toBe(7200);
      });

      it('should return default value when not configured', () => {
        mockGet.mockReturnValue(3600);

        const result = service.inboundChatSessionTtlSlack;

        expect(result).toBe(3600);
      });
    });

    describe('Lark inbound chat session TTL', () => {
      it('should return inboundChatSessionTtlLark with default', () => {
        mockGet.mockReturnValue(7200);

        const result = service.inboundChatSessionTtlLark;

        expect(mockGet).toHaveBeenCalledWith(
          'INBOUND_CHAT_SESSION_TTL_LARK',
          3600,
        );
        expect(result).toBe(7200);
      });

      it('should return default value when not configured', () => {
        mockGet.mockReturnValue(3600);

        const result = service.inboundChatSessionTtlLark;

        expect(result).toBe(3600);
      });
    });
  });

  describe('JWT Configuration', () => {
    describe('jwtSecret', () => {
      it('should return JWT_SECRET using getOrThrow', () => {
        mockGetOrThrow.mockReturnValue('super-secret-key');

        const result = service.jwtSecret;

        expect(mockGetOrThrow).toHaveBeenCalledWith('JWT_SECRET');
        expect(result).toBe('super-secret-key');
      });

      it('should throw error when JWT_SECRET is not set', () => {
        mockGetOrThrow.mockImplementation(() => {
          throw new Error('Configuration value not found');
        });

        expect(() => service.jwtSecret).toThrow(
          'Configuration value not found',
        );
      });
    });

    describe('jwtExpiresIn', () => {
      it('should return JWT_EXPIRES_IN using getOrThrow with default', () => {
        mockGetOrThrow.mockReturnValue('7200s');

        const result = service.jwtExpiresIn;

        expect(mockGetOrThrow).toHaveBeenCalledWith('JWT_EXPIRES_IN', '86400s');
        expect(result).toBe('7200s');
      });

      it('should return default value when not explicitly configured', () => {
        mockGetOrThrow.mockReturnValue('86400s');

        const result = service.jwtExpiresIn;

        expect(result).toBe('86400s');
      });
    });
  });
});
