import { Test, TestingModule } from '@nestjs/testing';
import { SlackInboundController } from './slack-inbound.controller';
import { SlackInboundService } from '../services/slack-inbound.service';

describe('SlackInboundController', () => {
  let controller: SlackInboundController;
  let service: jest.Mocked<SlackInboundService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<SlackInboundService>> = {
      handleEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SlackInboundController],
      providers: [
        {
          provide: SlackInboundService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<SlackInboundController>(SlackInboundController);
    service = module.get(SlackInboundService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleEvent', () => {
    it('should delegate to service.handleEvent with body and headers', async () => {
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
      const headers: Record<string, string> = { 'x-slack-signature': 'sig' };
      (service.handleEvent as jest.Mock).mockResolvedValue({ status: 'ok' });

      const spy = jest.spyOn(service, 'handleEvent');

      const result = await controller.handleEvent(payload, headers);

      expect(spy).toHaveBeenCalledWith(payload, headers);
      expect(result).toEqual({ status: 'ok' });
    });

    it('should propagate errors from service.handleEvent', async () => {
      const error = new Error('service-failed');
      (service.handleEvent as jest.Mock).mockRejectedValue(error);
      const spy = jest.spyOn(service, 'handleEvent');

      await expect(
        controller.handleEvent(
          {} as Record<string, unknown>,
          {} as Record<string, string>,
        ),
      ).rejects.toThrow('service-failed');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should handle url_verification challenge response', async () => {
      const payload: Record<string, unknown> = {
        token: 'Jhj5dZrVaK7ZwHHjRyZWjbDl',
        challenge: '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P',
        type: 'url_verification',
      };
      const headers: Record<string, string> = {};
      (service.handleEvent as jest.Mock).mockResolvedValue({
        challenge: '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P',
      });

      const result = await controller.handleEvent(payload, headers);

      expect(result).toEqual({
        challenge: '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P',
      });
    });
  });
});
