import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import {
  OutboundConsumer,
  SendOutboundMessageJobData,
} from './outbound.consumer';
import { LogsService } from '../../logs/logs.service';
import { ChatMessagesService } from '../../chat-messages/chat-messages.service';
import { ChatSessionsService } from '../../chat-sessions/chat-sessions.service';
import { CustomerStaffIdentitiesService } from '../../customer-staff-identities/customer-staff-identities.service';
import { LarkOutboundService } from '../services/lark-outbound.service';
import {
  ChatMessage,
  ChatSession,
  CustomerStaffIdentity,
} from '../../generated/prisma/client';

describe('OutboundConsumer', () => {
  let consumer: OutboundConsumer;
  let logs: LogsService;
  let chatMessages: ChatMessagesService;
  let chatSessions: ChatSessionsService;
  let identities: CustomerStaffIdentitiesService;
  let lark: LarkOutboundService;

  const mockChatMessage: ChatMessage = {
    id: 'm1',
    chatSessionId: 's1',
    messageType: 'ai',
    content: 'AI response',
    metadata: {},
    platformMessageId: 'ai_slack_123',
    createdAt: new Date(),
  };

  const mockChatSession: ChatSession = {
    id: 's1',
    chatAgentId: 'a1',
    customerStaffId: 'cs1',
    platform: 'lark',
    platformThreadId: 't1',
    sessionData: {},
    status: 'active',
    expiresAt: new Date(Date.now() + 3600_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockIdentity: CustomerStaffIdentity = {
    id: 'id1',
    customerStaffId: 'cs1',
    platform: 'lark',
    platformUserId: 'open_123',
    platformData: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboundConsumer,
        {
          provide: LogsService,
          useValue: { log: jest.fn(), debug: jest.fn(), error: jest.fn() },
        },
        { provide: ChatMessagesService, useValue: { findOne: jest.fn() } },
        { provide: ChatSessionsService, useValue: { findOne: jest.fn() } },
        {
          provide: CustomerStaffIdentitiesService,
          useValue: { findMany: jest.fn() },
        },
        { provide: LarkOutboundService, useValue: { send: jest.fn() } },
      ],
    }).compile();

    consumer = module.get(OutboundConsumer);
    logs = module.get(LogsService);
    chatMessages = module.get(ChatMessagesService);
    chatSessions = module.get(ChatSessionsService);
    identities = module.get(CustomerStaffIdentitiesService);
    lark = module.get(LarkOutboundService);

    jest.spyOn(chatMessages, 'findOne').mockResolvedValue(mockChatMessage);
    jest.spyOn(chatSessions, 'findOne').mockResolvedValue(mockChatSession);
    jest.spyOn(identities, 'findMany').mockResolvedValue([mockIdentity]);
    jest.spyOn(lark, 'send').mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  it('process send-message job successfully', async () => {
    const job = {
      name: 'send-message',
      data: { chatMessageId: 'm1' },
    } as unknown as Job<SendOutboundMessageJobData, any, string>;
    const res = String(await consumer.process(job));
    expect(res).toBe('OK');
    expect(jest.spyOn(lark, 'send')).toHaveBeenCalledWith({
      receiveIdType: 'open_id',
      receiveId: 'open_123',
      msgType: 'text',
      content: 'AI response',
    });
  });

  it('skips when unknown job', async () => {
    const job = {
      name: 'other',
      data: { chatMessageId: 'x' },
    } as unknown as Job<SendOutboundMessageJobData, any, string>;
    const res = String(await consumer.process(job));
    expect(res).toBe('OK');
  });

  it('logs error when message not found', async () => {
    jest.spyOn(chatMessages, 'findOne').mockResolvedValue(null);
    const job = {
      name: 'send-message',
      data: { chatMessageId: 'm1' },
    } as unknown as Job<SendOutboundMessageJobData, any, string>;
    await consumer.process(job);
    expect(jest.spyOn(logs, 'error')).toHaveBeenCalled();
    expect(jest.spyOn(lark, 'send')).not.toHaveBeenCalled();
  });

  it('logs error when session not found', async () => {
    jest.spyOn(chatSessions, 'findOne').mockResolvedValue(null);
    const job = {
      name: 'send-message',
      data: { chatMessageId: 'm1' },
    } as unknown as Job<SendOutboundMessageJobData, any, string>;
    await consumer.process(job);
    expect(jest.spyOn(logs, 'error')).toHaveBeenCalled();
    expect(jest.spyOn(lark, 'send')).not.toHaveBeenCalled();
  });

  it('skips when identity missing', async () => {
    jest.spyOn(identities, 'findMany').mockResolvedValue([]);
    const job = {
      name: 'send-message',
      data: { chatMessageId: 'm1' },
    } as unknown as Job<SendOutboundMessageJobData, any, string>;
    await consumer.process(job);
    expect(jest.spyOn(logs, 'error')).toHaveBeenCalled();
    expect(jest.spyOn(lark, 'send')).not.toHaveBeenCalled();
  });
});
