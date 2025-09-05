import { Test, TestingModule } from '@nestjs/testing';
import { SampleInboundController } from './sample-inbound.controller';
import { SampleInboundService } from '../services/sample-inbound.service';

describe('SampleInboundController', () => {
  let controller: SampleInboundController;
  let sampleInboundService: jest.Mocked<SampleInboundService>;
  let submitSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockSampleInboundService = {
      submit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SampleInboundController],
      providers: [
        {
          provide: SampleInboundService,
          useValue: mockSampleInboundService,
        },
      ],
    }).compile();

    controller = module.get<SampleInboundController>(SampleInboundController);
    sampleInboundService = module.get(SampleInboundService);
    submitSpy = jest.spyOn(sampleInboundService, 'submit');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sampleCreate', () => {
    it('should call sampleInboundService.submit and return the result', async () => {
      // Arrange
      const expectedResult = 'OK';
      submitSpy.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.sampleCreate();

      // Assert
      expect(submitSpy).toHaveBeenCalledTimes(1);
      expect(submitSpy).toHaveBeenCalledWith();
      expect(result).toBe(expectedResult);
    });

    it('should handle service errors and propagate them', async () => {
      // Arrange
      const error = new Error('Service error');
      submitSpy.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.sampleCreate()).rejects.toThrow('Service error');
      expect(submitSpy).toHaveBeenCalledTimes(1);
    });

    it('should return the exact value from service', async () => {
      // Arrange
      const customResult = 'Custom result';
      submitSpy.mockResolvedValue(customResult);

      // Act
      const result = await controller.sampleCreate();

      // Assert
      expect(result).toBe(customResult);
      expect(typeof result).toBe('string');
    });

    it('should call service method without any parameters', async () => {
      // Arrange
      submitSpy.mockResolvedValue('OK');

      // Act
      await controller.sampleCreate();

      // Assert
      expect(submitSpy).toHaveBeenCalledWith();
      expect(submitSpy).toHaveBeenCalledTimes(1);
    });
  });
});
