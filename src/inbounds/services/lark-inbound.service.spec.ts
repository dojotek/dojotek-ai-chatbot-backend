import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { LarkInboundService } from './lark-inbound.service';
import { ConfigsService } from '../../configs/configs.service';
import { ChannelsService } from '../../channels/channels.service';
import { CustomerStaffIdentitiesService } from '../../customer-staff-identities/customer-staff-identities.service';
import { CustomerStaffsService } from '../../customer-staffs/customer-staffs.service';
import { ChatSessionsService } from '../../chat-sessions/chat-sessions.service';
import { ChatMessagesService } from '../../chat-messages/chat-messages.service';
import { ChatAgentsService } from '../../chat-agents/chat-agents.service';

describe('LarkInboundService', () => {
  let service: LarkInboundService;

  const mockQueue: { add: jest.Mock } = {
    add: jest.fn(),
  };

  const mockConfigsService: Partial<ConfigsService> = {
    larkVerificationToken: 'token-123',
    larkEncryptKey: undefined,
    // generic mock to satisfy signature <T>(key: string, defaultValue: T) => T
    getConfigWithDefault: jest.fn(<T>(key: string, defaultValue: T): T => {
      if (key === 'LARK_VERIFICATION_TOKEN') return '' as unknown as T;
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
        LarkInboundService,
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

    service = module.get<LarkInboundService>(LarkInboundService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleEvent - url_verification', () => {
    it('should return challenge when token matches', async () => {
      Object.defineProperty(mockConfigsService, 'larkVerificationToken', {
        value: 'token-123',
        configurable: true,
      });

      const payload: Record<string, unknown> = {
        type: 'url_verification',
        token: 'token-123',
        challenge: 'abc',
      };
      const headers: Record<string, string> = {} as Record<string, string>;

      const result = await service.handleEvent(payload, headers);

      expect(result).toEqual({ challenge: 'abc' });
    });

    it('should throw UnauthorizedException when token mismatches', async () => {
      Object.defineProperty(mockConfigsService, 'larkVerificationToken', {
        value: 'token-expected',
        configurable: true,
      });

      const payload: Record<string, unknown> = {
        type: 'url_verification',
        token: 'wrong',
        challenge: 'abc',
      };
      const headers: Record<string, string> = {} as Record<string, string>;

      await expect(service.handleEvent(payload, headers)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('handleEvent - im.message.receive_v1', () => {
    const baseHeaders: Record<string, string> = {} as Record<string, string>;

    it('should ignore when tenantKey or openId missing', async () => {
      // Provide minimally valid payload except missing open_id to pass DTO validation
      const payload: Record<string, unknown> = {
        schema: '2.0',
        header: {
          event_id: 'evt_1',
          event_type: 'im.message.receive_v1',
          create_time: `${Date.now()}`,
          token: 'tok',
          app_id: 'app_1',
          tenant_key: 'tnk_1',
        },
        event: {
          sender: { sender_id: {}, sender_type: 'user' },
          message: {
            message_id: 'm_1',
            create_time: `${Date.now()}`,
            chat_id: 'c_1',
            chat_type: 'p2p',
            message_type: 'text',
            content: JSON.stringify({ text: 'hi' }),
          },
        },
      };

      const result = await service.handleEvent(payload, baseHeaders);
      expect(result).toEqual({});
    });

    it('should create identity and staff, persist message, and enqueue processing when new user', async () => {
      (mockConfigsService.getConfigWithDefault as jest.Mock).mockImplementation(
        (key: string, def: string) => def,
      );

      const payload: Record<string, unknown> = {
        schema: '2.0',
        header: {
          event_id: 'evt_2',
          event_type: 'im.message.receive_v1',
          create_time: `${Date.now()}`,
          token: 'tok',
          app_id: 'app_1',
          tenant_key: 'tnk_1',
        },
        event: {
          sender: { sender_id: { open_id: 'open_123' }, sender_type: 'user' },
          message: {
            message_id: 'mid_1',
            create_time: `${Date.now()}`,
            chat_id: 'cid_1',
            chat_type: 'p2p',
            message_type: 'text',
            content: JSON.stringify({ text: 'Hello' }),
          },
        },
      };

      (mockChannelsService.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'channel1',
          platform: 'lark',
          workspaceId: 'tnk_1',
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
        where: { platform: 'lark', workspaceId: 'tnk_1' },
        take: 1,
      });
      expect(mockCustomerStaffsService.create).toHaveBeenCalled();
      expect(mockCustomerStaffIdentitiesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'lark',
          platformUserId: 'open_123',
        }),
      );
      expect(
        mockChatSessionsService.getInboundChatSessionId,
      ).toHaveBeenCalledWith('agent_1', 'cust_1', 'staff_1', 'lark');
      expect(mockChatMessagesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chatSessionId: 'session_1',
          content: 'Hello',
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
        schema: '2.0',
        header: {
          event_id: 'evt_3',
          event_type: 'im.message.receive_v1',
          create_time: `${Date.now()}`,
          token: 'tok',
          app_id: 'app_1',
          tenant_key: 'tnk_1',
        },
        event: {
          sender: { sender_id: { open_id: 'open_456' }, sender_type: 'user' },
          message: {
            message_id: 'mid_2',
            create_time: `${Date.now()}`,
            chat_id: 'cid_2',
            chat_type: 'group',
            message_type: 'text',
            content: JSON.stringify({ text: 'Hi again' }),
          },
        },
      };

      (mockChannelsService.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'channel1',
          platform: 'lark',
          workspaceId: 'tnk_1',
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
