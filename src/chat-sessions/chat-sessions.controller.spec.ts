import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatSessionsController } from './chat-sessions.controller';
import { ChatSessionsService } from './chat-sessions.service';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { UpdateChatSessionDto } from './dto/update-chat-session.dto';

describe('ChatSessionsController', () => {
  let controller: ChatSessionsController;

  const mockChatSession = {
    id: '1',
    chatAgentId: 'chat-agent-1',
    customerStaffId: 'customer-staff-1',
    platform: 'slack',
    platformThreadId: 'C1234567890',
    sessionData: { conversationContext: 'ongoing_support' },
    status: 'active',
    expiresAt: new Date('2023-12-31T23:59:59.000Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateChatSessionDto: CreateChatSessionDto = {
    chatAgentId: 'chat-agent-1',
    customerStaffId: 'customer-staff-1',
    platform: 'slack',
    platformThreadId: 'C1234567890',
    sessionData: { conversationContext: 'ongoing_support' },
    status: 'active',
    expiresAt: '2023-12-31T23:59:59.000Z',
  };

  const mockUpdateChatSessionDto: UpdateChatSessionDto = {
    status: 'closed',
    sessionData: { reason: 'user_ended_session' },
  };

  const mockChatSessionsService = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatSessionsController],
      providers: [
        {
          provide: ChatSessionsService,
          useValue: mockChatSessionsService,
        },
      ],
    }).compile();

    controller = module.get<ChatSessionsController>(ChatSessionsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a chat session successfully', async () => {
      mockChatSessionsService.create.mockResolvedValue(mockChatSession);

      const result = await controller.create(mockCreateChatSessionDto);

      expect(mockChatSessionsService.create).toHaveBeenCalledWith(
        mockCreateChatSessionDto,
      );
      expect(result).toEqual(mockChatSession);
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Chat agent not found',
        HttpStatus.CONFLICT,
      );
      mockChatSessionsService.create.mockRejectedValue(httpException);

      await expect(controller.create(mockCreateChatSessionDto)).rejects.toThrow(
        httpException,
      );
      expect(mockChatSessionsService.create).toHaveBeenCalledWith(
        mockCreateChatSessionDto,
      );
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Database connection failed');
      mockChatSessionsService.create.mockRejectedValue(unexpectedError);

      await expect(controller.create(mockCreateChatSessionDto)).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while creating chat session',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockChatSessionsService.create).toHaveBeenCalledWith(
        mockCreateChatSessionDto,
      );
    });
  });

  describe('findAll', () => {
    it('should return all chat sessions successfully', async () => {
      const mockChatSessions = [mockChatSession];
      mockChatSessionsService.findMany.mockResolvedValue(mockChatSessions);

      const result = await controller.findAll();

      expect(mockChatSessionsService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChatSessions);
    });

    it('should return chat sessions with query parameters', async () => {
      const mockChatSessions = [mockChatSession];
      mockChatSessionsService.findMany.mockResolvedValue(mockChatSessions);

      const result = await controller.findAll(
        5, // skip
        20, // take
        'test', // search
        'chat-agent-1', // chatAgentId
        'customer-staff-1', // customerStaffId
        'slack', // platform
        'active', // status
      );

      expect(mockChatSessionsService.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 20,
        where: {
          AND: [
            {
              chatAgentId: 'chat-agent-1',
              customerStaffId: 'customer-staff-1',
              platform: { contains: 'slack', mode: 'insensitive' },
              status: 'active',
            },
            {
              OR: [
                { platform: { contains: 'test', mode: 'insensitive' } },
                { platformThreadId: { contains: 'test', mode: 'insensitive' } },
                { status: { contains: 'test', mode: 'insensitive' } },
              ],
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChatSessions);
    });

    it('should return chat sessions with filters but no search', async () => {
      const mockChatSessions = [mockChatSession];
      mockChatSessionsService.findMany.mockResolvedValue(mockChatSessions);

      const result = await controller.findAll(
        undefined, // skip
        undefined, // take
        undefined, // search
        'chat-agent-1', // chatAgentId
        'customer-staff-1', // customerStaffId
        'slack', // platform
        'active', // status
      );

      expect(mockChatSessionsService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          chatAgentId: 'chat-agent-1',
          customerStaffId: 'customer-staff-1',
          platform: { contains: 'slack', mode: 'insensitive' },
          status: 'active',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockChatSessions);
    });

    it('should throw HttpException when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockChatSessionsService.findMany.mockRejectedValue(unexpectedError);

      await expect(controller.findAll()).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while fetching chat sessions',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('findOne', () => {
    it('should return a chat session successfully', async () => {
      mockChatSessionsService.findOne.mockResolvedValue(mockChatSession);

      const result = await controller.findOne('1');

      expect(mockChatSessionsService.findOne).toHaveBeenCalledWith({
        id: '1',
      });
      expect(result).toEqual(mockChatSession);
    });

    it('should throw HttpException with NOT_FOUND when chat session is not found', async () => {
      mockChatSessionsService.findOne.mockResolvedValue(null);

      await expect(controller.findOne('1')).rejects.toThrow(
        new HttpException('Chat session not found', HttpStatus.NOT_FOUND),
      );
      expect(mockChatSessionsService.findOne).toHaveBeenCalledWith({
        id: '1',
      });
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockChatSessionsService.findOne.mockRejectedValue(unexpectedError);

      await expect(controller.findOne('1')).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while fetching chat session',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockChatSessionsService.findOne).toHaveBeenCalledWith({
        id: '1',
      });
    });
  });

  describe('update', () => {
    it('should update a chat session successfully', async () => {
      const updatedChatSession = {
        ...mockChatSession,
        status: 'closed',
      };
      mockChatSessionsService.update.mockResolvedValue(updatedChatSession);

      const result = await controller.update('1', mockUpdateChatSessionDto);

      expect(mockChatSessionsService.update).toHaveBeenCalledWith(
        { id: '1' },
        mockUpdateChatSessionDto,
      );
      expect(result).toEqual(updatedChatSession);
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Chat session not found',
        HttpStatus.CONFLICT,
      );
      mockChatSessionsService.update.mockRejectedValue(httpException);

      await expect(
        controller.update('1', mockUpdateChatSessionDto),
      ).rejects.toThrow(httpException);
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockChatSessionsService.update.mockRejectedValue(unexpectedError);

      await expect(
        controller.update('1', mockUpdateChatSessionDto),
      ).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while updating chat session',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('remove', () => {
    it('should delete a chat session successfully', async () => {
      mockChatSessionsService.delete.mockResolvedValue(mockChatSession);

      const result = await controller.remove('1');

      expect(mockChatSessionsService.delete).toHaveBeenCalledWith({
        id: '1',
      });
      expect(result).toBeUndefined();
    });

    it('should throw HttpException when service throws HttpException', async () => {
      const httpException = new HttpException(
        'Chat session not found',
        HttpStatus.CONFLICT,
      );
      mockChatSessionsService.delete.mockRejectedValue(httpException);

      await expect(controller.remove('1')).rejects.toThrow(httpException);
      expect(mockChatSessionsService.delete).toHaveBeenCalledWith({
        id: '1',
      });
    });

    it('should throw HttpException with INTERNAL_SERVER_ERROR when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockChatSessionsService.delete.mockRejectedValue(unexpectedError);

      await expect(controller.remove('1')).rejects.toThrow(
        new HttpException(
          'An unexpected error occurred while deleting chat session',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
      expect(mockChatSessionsService.delete).toHaveBeenCalledWith({
        id: '1',
      });
    });
  });
});
