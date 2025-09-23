import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { Setting } from './entities/setting.entity';

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: SettingsService;

  const mockSetting: Setting = {
    id: '01234567-89ab-cdef-0123-456789abcdef',
    key: 'OPENAI_API_KEY',
    value: 's****f',
    description: 'API key',
    category: 'Sensitive',
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
  };

  const mockService: jest.Mocked<SettingsService> = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<SettingsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [{ provide: SettingsService, useValue: mockService }],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
    service = module.get<SettingsService>(SettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create setting via service', async () => {
      const dto: CreateSettingDto = {
        key: 'K',
        value: 'V',
      } as CreateSettingDto;
      const createSpy = jest
        .spyOn(service, 'create')
        .mockResolvedValue(mockSetting as unknown as Setting);
      const result = await controller.create(dto);
      expect(createSpy).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockSetting);
    });
  });

  describe('findAll', () => {
    it('should pass pagination and filters to service', async () => {
      const findManySpy = jest
        .spyOn(service, 'findMany')
        .mockResolvedValue([mockSetting] as unknown as Setting[]);
      const result = await controller.findAll(0, 5, 'API', 'Sensitive');
      expect(findManySpy).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id', async () => {
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(mockSetting as unknown as Setting);
      const result = await controller.findOne(mockSetting.id);
      expect(findOneSpy).toHaveBeenCalledWith({ id: mockSetting.id }, true);
      expect(result).toEqual(mockSetting);
    });
  });

  describe('findByKey', () => {
    it('should call service.findOne with key', async () => {
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(mockSetting as unknown as Setting);
      const result = await controller.findByKey('OPENAI_API_KEY');
      expect(findOneSpy).toHaveBeenCalledWith({ key: 'OPENAI_API_KEY' }, true);
      expect(result).toEqual(mockSetting);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const dto: UpdateSettingDto = { value: 'X' } as UpdateSettingDto;
      const updateSpy = jest
        .spyOn(service, 'update')
        .mockResolvedValue(mockSetting as unknown as Setting);
      const result = await controller.update(mockSetting.id, dto);
      expect(updateSpy).toHaveBeenCalledWith({ id: mockSetting.id }, dto);
      expect(result).toEqual(mockSetting);
    });
  });

  describe('remove', () => {
    it('should call service.delete with id', async () => {
      const deleteSpy = jest
        .spyOn(service, 'delete')
        .mockResolvedValue(mockSetting as unknown as Setting);
      await controller.remove(mockSetting.id);
      expect(deleteSpy).toHaveBeenCalledWith({ id: mockSetting.id });
    });
  });
});
