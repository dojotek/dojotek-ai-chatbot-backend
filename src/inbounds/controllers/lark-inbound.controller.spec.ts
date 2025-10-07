import { Test, TestingModule } from '@nestjs/testing';
import { LarkInboundController } from './lark-inbound.controller';
import { LarkInboundService } from '../services/lark-inbound.service';

describe('LarkInboundController', () => {
  let controller: LarkInboundController;
  let service: jest.Mocked<LarkInboundService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<LarkInboundService>> = {
      handleEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LarkInboundController],
      providers: [
        {
          provide: LarkInboundService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<LarkInboundController>(LarkInboundController);
    service = module.get(LarkInboundService);
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
        event: { type: 'im.message.receive_v1' },
      };
      const headers: Record<string, string> = { 'x-signature': 'sig' };
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
  });
});
