import { Test, TestingModule } from '@nestjs/testing';
import { LogsService } from './logs.service';
import { PinoLogger } from 'nestjs-pino';
import { ConfigsService } from '../configs/configs.service';

describe('LogsService', () => {
  let service: LogsService;
  let pinoLogger: jest.Mocked<PinoLogger>;
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockPinoLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const mockConfigsService = {
      getConfigWithDefault: jest.fn(),
      getRequiredConfig: jest.fn(),
      port: 3000,
      nodeEnv: 'test',
      logLevel: 'info',
      messageQueueValkeyHost: 'localhost',
      messageQueueValkeyPort: 6380,
      cacheValkeyHost: 'localhost',
      cacheValkeyPort: 6379,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogsService,
        {
          provide: PinoLogger,
          useValue: mockPinoLogger,
        },
        {
          provide: ConfigsService,
          useValue: mockConfigsService,
        },
      ],
    }).compile();

    service = module.get<LogsService>(LogsService);
    pinoLogger = module.get(PinoLogger);

    // Create spies for the logger methods
    infoSpy = jest.spyOn(pinoLogger, 'info');
    errorSpy = jest.spyOn(pinoLogger, 'error');
    warnSpy = jest.spyOn(pinoLogger, 'warn');
    debugSpy = jest.spyOn(pinoLogger, 'debug');

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should call pinoLogger.info with correct parameters', () => {
      const message = 'Test log message';
      const context = 'TestContext';

      service.log(message, context);

      expect(infoSpy).toHaveBeenCalledWith({ context }, message);
    });

    it('should use default context when not provided', () => {
      const message = 'Test log message';

      service.log(message);

      expect(infoSpy).toHaveBeenCalledWith({ context: 'LogsService' }, message);
    });
  });

  describe('error', () => {
    it('should call pinoLogger.error with correct parameters', () => {
      const message = 'Test error message';
      const trace = 'Error trace';
      const context = 'TestContext';

      service.error(message, trace, context);

      expect(errorSpy).toHaveBeenCalledWith({ context, trace }, message);
    });

    it('should use default context when not provided', () => {
      const message = 'Test error message';
      const trace = 'Error trace';

      service.error(message, trace);

      expect(errorSpy).toHaveBeenCalledWith(
        { context: 'LogsService', trace },
        message,
      );
    });
  });

  describe('warn', () => {
    it('should call pinoLogger.warn with correct parameters', () => {
      const message = 'Test warning message';
      const context = 'TestContext';

      service.warn(message, context);

      expect(warnSpy).toHaveBeenCalledWith({ context }, message);
    });

    it('should use default context when not provided', () => {
      const message = 'Test warning message';

      service.warn(message);

      expect(warnSpy).toHaveBeenCalledWith({ context: 'LogsService' }, message);
    });
  });

  describe('debug', () => {
    it('should call pinoLogger.debug with correct parameters', () => {
      const message = 'Test debug message';
      const context = 'TestContext';

      service.debug(message, context);

      expect(debugSpy).toHaveBeenCalledWith({ context }, message);
    });

    it('should use default context when not provided', () => {
      const message = 'Test debug message';

      service.debug(message);

      expect(debugSpy).toHaveBeenCalledWith(
        { context: 'LogsService' },
        message,
      );
    });
  });
});
