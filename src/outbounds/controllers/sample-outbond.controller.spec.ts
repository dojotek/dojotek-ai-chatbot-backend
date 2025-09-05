import { Test, TestingModule } from '@nestjs/testing';
import { SampleOutbondController } from './sample-outbond.controller';
import { SampleOutbondService } from '../services/sample-outbond.service';

describe('SampleOutbondController', () => {
  let controller: SampleOutbondController;
  let sampleOutbondService: jest.Mocked<SampleOutbondService>;
  let submitSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockSampleOutbondService = {
      submit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SampleOutbondController],
      providers: [
        {
          provide: SampleOutbondService,
          useValue: mockSampleOutbondService,
        },
      ],
    }).compile();

    controller = module.get<SampleOutbondController>(SampleOutbondController);
    sampleOutbondService = module.get(SampleOutbondService);
    submitSpy = jest.spyOn(sampleOutbondService, 'submit');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sampleCreate', () => {
    it('should call sampleOutbondService.submit and return the result', async () => {
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
