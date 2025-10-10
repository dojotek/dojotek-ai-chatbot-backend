import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { SlackInboundService } from './slack-inbound.service';
import { ConfigsService } from '../../configs/configs.service';
import { ChannelsService } from '../../channels/channels.service';
import { CustomerStaffIdentitiesService } from '../../customer-staff-identities/customer-staff-identities.service';
import { CustomerStaffsService } from '../../customer-staffs/customer-staffs.service';
import { ChatSessionsService } from '../../chat-sessions/chat-sessions.service';
import { ChatMessagesService } from '../../chat-messages/chat-messages.service';
import { ChatAgentsService } from '../../chat-agents/chat-agents.service';

describe('SlackInboundService', () => {
  let service: SlackInboundService;

  const mockQueue: { add: jest.Mock } = {
    add: jest.fn(),
  };

  const mockConfigsService: Partial<ConfigsService> = {
    slackVerificationToken: 'token-123',
    slackSigningSecret: 'signing-secret-123',
    // generic mock to satisfy signature <T>(key: string, defaultValue: T) => T
    getConfigWithDefault: jest.fn(<T>(key: string, defaultValue: T): T => {
      if (key === 'SLACK_VERIFICATION_TOKEN') return '' as unknown as T;
      return defaultValue;
    }) as unknown as ConfigsService['getConfigWithDefault'],
  };

  const mockChannelsService: Partial<ChannelsService> = {
    findMany: jest.fn(),
  };

  const mockCustomerStaffIdentitiesService: Partial<CustomerStaffIdentitiesService> =
    {
      findMany: jest.fn(),
      create: jest.fn(),
    };

  const mockCustomerStaffsService: Partial<CustomerStaffsService> = {
    create: jest.fn(),
  };

  const mockChatSessionsService: Partial<ChatSessionsService> = {
    getInboundChatSessionId: jest.fn(),
  };

  const mockChatMessagesService: Partial<ChatMessagesService> = {
    create: jest.fn(),
  };

  const mockChatAgentsService: Partial<ChatAgentsService> = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlackInboundService,
        { provide: ConfigsService, useValue: mockConfigsService },
        { provide: ChannelsService, useValue: mockChannelsService },
        {
          provide: CustomerStaffIdentitiesService,
          useValue: mockCustomerStaffIdentitiesService,
        },
        { provide: CustomerStaffsService, useValue: mockCustomerStaffsService },
        { provide: ChatSessionsService, useValue: mockChatSessionsService },
        { provide: ChatMessagesService, useValue: mockChatMessagesService },
        { provide: ChatAgentsService, useValue: mockChatAgentsService },
        {
          provide: getQueueToken('inbounds-for-chat-agents'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<SlackInboundService>(SlackInboundService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleEvent - url_verification', () => {
    it('should return challenge from payload', async () => {
      const payload: Record<string, unknown> = {
        token: 'any-token',
        challenge: '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P',
        type: 'url_verification',
      };
      const headers: Record<string, string> = {} as Record<string, string>;

      const result = await service.handleEvent(payload, headers);

      expect(result).toEqual({
        challenge: '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P',
      });
    });

    it('should return challenge regardless of token value', async () => {
      const payload: Record<string, unknown> = {
        token: 'wrong-token',
        challenge: '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P',
        type: 'url_verification',
      };
      const headers: Record<string, string> = {} as Record<string, string>;

      const result = await service.handleEvent(payload, headers);

      expect(result).toEqual({
        challenge: '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P',
      });
    });
  });

  describe('handleEvent - event_callback', () => {
    const baseHeaders: Record<string, string> = {} as Record<string, string>;

    it('should ignore when teamId or userId missing', async () => {
      // Provide minimally valid payload except missing user to pass DTO validation
      const payload: Record<string, unknown> = {
        token: 'z26uFbvR1xHJEdHE1OQiO6t8',
        team_id: 'T123ABC456',
        api_app_id: 'A123ABC456',
        event: {
          type: 'reaction_added',
          user: 'U123ABC456',
          item: {
            type: 'message',
            channel: 'C123ABC456',
            ts: '1464196127.000002',
          },
          reaction: 'slightly_smiling_face',
          item_user: 'U222222222',
          event_ts: '1465244570.336841',
        },
        type: 'event_callback',
        authed_users: ['U123ABC456'],
        authorizations: [
          {
            enterprise_id: 'E123ABC456',
            team_id: 'T123ABC456',
            user_id: 'U123ABC456',
            is_bot: 'false',
          },
        ],
        event_id: 'Ev123ABC456',
        event_context: 'EC123ABC456',
        event_time: '1234567890',
      };

      const result = await service.handleEvent(payload, baseHeaders);
      expect(result).toEqual({});
    });

    it('should create identity and staff, persist message, and enqueue processing when new user', async () => {
      (mockConfigsService.getConfigWithDefault as jest.Mock).mockImplementation(
        (key: string, def: string) => def,
      );

      const payload: Record<string, unknown> = {
        token: 'z26uFbvR1xHJEdHE1OQiO6t8',
        team_id: 'T123ABC456',
        api_app_id: 'A123ABC456',
        event: {
          type: 'message',
          user: 'U123ABC456',
          item: {
            type: 'message',
            channel: 'C123ABC456',
            ts: '1464196127.000002',
          },
          reaction: 'slightly_smiling_face',
          item_user: 'U222222222',
          event_ts: '1465244570.336841',
        },
        type: 'event_callback',
        authed_users: ['U123ABC456'],
        authorizations: [
          {
            enterprise_id: 'E123ABC456',
            team_id: 'T123ABC456',
            user_id: 'U123ABC456',
            is_bot: 'false',
          },
        ],
        event_id: 'Ev123ABC456',
        event_context: 'EC123ABC456',
        event_time: '1234567890',
      };

      (mockChannelsService.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'channel1',
          platform: 'slack',
          workspaceId: 'T123ABC456',
          chatAgentId: 'agent_1',
        },
      ]);
      (mockChatAgentsService.findOne as jest.Mock).mockResolvedValue({
        id: 'agent_1',
        customerId: 'cust_1',
      });
      (
        mockCustomerStaffIdentitiesService.findMany as jest.Mock
      ).mockResolvedValue([]);
      (mockCustomerStaffsService.create as jest.Mock).mockResolvedValue({
        id: 'staff_1',
      });
      (
        mockCustomerStaffIdentitiesService.create as jest.Mock
      ).mockResolvedValue({ id: 'identity_1' });
      (
        mockChatSessionsService.getInboundChatSessionId as jest.Mock
      ).mockResolvedValue('session_1');
      (mockChatMessagesService.create as jest.Mock).mockResolvedValue({
        id: 'msg_1',
      });

      const result = await service.handleEvent(payload, baseHeaders);

      expect(mockChannelsService.findMany).toHaveBeenCalledWith({
        where: { platform: 'slack', workspaceId: 'T123ABC456' },
        take: 1,
      });
      expect(mockCustomerStaffsService.create).toHaveBeenCalled();
      expect(mockCustomerStaffIdentitiesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'slack',
          platformUserId: 'U123ABC456',
        }),
      );
      expect(
        mockChatSessionsService.getInboundChatSessionId,
      ).toHaveBeenCalledWith('agent_1', 'cust_1', 'staff_1', 'slack');
      expect(mockChatMessagesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chatSessionId: 'session_1',
          content: expect.stringContaining(
            'Message from Slack user U123ABC456',
          ) as unknown as string,
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-inbound-message',
        expect.objectContaining({
          chatSessionId: 'session_1',
          chatMessageId: 'msg_1',
        }),
      );
      expect(result).toEqual({});
    });

    it('should use existing identity path and enqueue when known user', async () => {
      (mockConfigsService.getConfigWithDefault as jest.Mock).mockImplementation(
        (key: string, def: string) => def,
      );

      const payload: Record<string, unknown> = {
        token: 'z26uFbvR1xHJEdHE1OQiO6t8',
        team_id: 'T123ABC456',
        api_app_id: 'A123ABC456',
        event: {
          type: 'message',
          user: 'U456DEF789',
          item: {
            type: 'message',
            channel: 'C123ABC456',
            ts: '1464196127.000002',
          },
          reaction: 'slightly_smiling_face',
          item_user: 'U222222222',
          event_ts: '1465244570.336841',
        },
        type: 'event_callback',
        authed_users: ['U456DEF789'],
        authorizations: [
          {
            enterprise_id: 'E123ABC456',
            team_id: 'T123ABC456',
            user_id: 'U456DEF789',
            is_bot: 'false',
          },
        ],
        event_id: 'Ev123ABC456',
        event_context: 'EC123ABC456',
        event_time: '1234567890',
      };

      (mockChannelsService.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'channel1',
          platform: 'slack',
          workspaceId: 'T123ABC456',
          chatAgentId: 'agent_1',
        },
      ]);
      (mockChatAgentsService.findOne as jest.Mock).mockResolvedValue({
        id: 'agent_1',
        customerId: 'cust_9',
      });
      (
        mockCustomerStaffIdentitiesService.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'ident_99', customerStaffId: 'staff_99' }]);
      (
        mockChatSessionsService.getInboundChatSessionId as jest.Mock
      ).mockResolvedValue('session_99');
      (mockChatMessagesService.create as jest.Mock).mockResolvedValue({
        id: 'msg_99',
      });

      const result = await service.handleEvent(payload, baseHeaders);

      expect(mockCustomerStaffsService.create).not.toHaveBeenCalled();
      expect(mockCustomerStaffIdentitiesService.create).not.toHaveBeenCalled();
      expect(mockChatMessagesService.create).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalled();
      expect(result).toEqual({});
    });
  });
});
