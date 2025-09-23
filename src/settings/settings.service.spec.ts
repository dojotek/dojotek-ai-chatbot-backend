import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import {
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Setting } from './entities/setting.entity';

const mockSetting = {
  id: '01234567-89ab-cdef-0123-456789abcdef',
  key: 'OPENAI_API_KEY',
  value: 'sk-abcdef',
  description: 'API key',
  category: 'Sensitive',
  createdAt: new Date('2023-01-01T00:00:00.000Z'),
  updatedAt: new Date('2023-01-01T00:00:00.000Z'),
};

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: PrismaService;
  let cache: CachesService;
  // Removed unused variable to satisfy linter

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: PrismaService,
          useValue: {
            setting: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: CachesService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: ConfigsService,
          useValue: {
            cachePrefixSettings: 'settings',
            cacheTtlSettings: 3600,
          },
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    prisma = module.get<PrismaService>(PrismaService);
    cache = module.get<CachesService>(CachesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('redaction', () => {
    it('should redact Sensitive values', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest
        .spyOn(prisma.setting, 'findUnique')
        .mockResolvedValue(mockSetting as unknown as Setting);

      const result = await service.findOne({ id: mockSetting.id }, true);
      expect(result?.value).toBe('s****f');
    });

    it('should not redact non-Sensitive', async () => {
      const nonSensitive = { ...mockSetting, category: 'General' } as Setting;
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest
        .spyOn(prisma.setting, 'findUnique')
        .mockResolvedValue(nonSensitive as unknown as Setting);

      const result = await service.findOne({ id: nonSensitive.id }, true);
      expect(result?.value).toBe(nonSensitive.value);
    });
  });

  describe('findOne', () => {
    it('should return from cache when available', async () => {
      const cacheGetSpy = jest
        .spyOn(cache, 'get')
        .mockResolvedValue(mockSetting as unknown as Setting);

      const result = await service.findOne({ id: mockSetting.id }, true);
      expect(cacheGetSpy).toHaveBeenCalled();
      expect(result?.id).toBe(mockSetting.id);
    });

    it('should return null when not found', async () => {
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest.spyOn(prisma.setting, 'findUnique').mockResolvedValue(null);

      const result = await service.findOne({ id: 'not-found' }, true);
      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should return list with Sensitive redaction', async () => {
      jest
        .spyOn(prisma.setting, 'findMany')
        .mockResolvedValue([mockSetting] as unknown as Setting[]);
      const result = await service.findMany({
        take: 10,
        redactSensitive: true,
      });
      expect(result[0].value).toBe('s****f');
    });
  });

  describe('create', () => {
    it('should create and cache', async () => {
      jest
        .spyOn(prisma.setting, 'create')
        .mockResolvedValue(mockSetting as unknown as Setting);
      const cacheSetSpy = jest
        .spyOn(cache, 'set')
        .mockResolvedValue('OK' as const);

      const result = await service.create({
        key: mockSetting.key,
        value: mockSetting.value,
        description: mockSetting.description,
        category: mockSetting.category,
      });

      expect(result.id).toBe(mockSetting.id);
      expect(cacheSetSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle unique constraint error', async () => {
      const error = {
        code: 'P2002',
        meta: { target: ['key'] },
      };
      jest.spyOn(prisma.setting, 'create').mockRejectedValue(error);
      await expect(
        service.create({ key: 'dup', value: 'v' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should map other prisma errors to InternalServerError', async () => {
      const error = { code: 'P2010' };
      jest.spyOn(prisma.setting, 'create').mockRejectedValue(error);
      await expect(
        service.create({ key: 'k', value: 'v' }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('update', () => {
    it('should update and refresh cache', async () => {
      jest
        .spyOn(prisma.setting, 'findUnique')
        .mockResolvedValue(mockSetting as unknown as Setting);
      const updated = { ...mockSetting, value: 'new' };
      jest
        .spyOn(prisma.setting, 'update')
        .mockResolvedValue(updated as unknown as Setting);
      const delSpy = jest.spyOn(cache, 'del').mockResolvedValue(1 as number);
      const setSpy = jest.spyOn(cache, 'set').mockResolvedValue('OK' as const);

      const result = await service.update(
        { id: mockSetting.id },
        { value: 'new' },
      );
      expect(result.value).toBe('new');
      expect(delSpy).toHaveBeenCalledTimes(2);
      expect(setSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFound when missing', async () => {
      jest.spyOn(prisma.setting, 'findUnique').mockResolvedValue(null);
      await expect(
        service.update({ id: 'missing' }, { value: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should map P2002 to Conflict', async () => {
      jest
        .spyOn(prisma.setting, 'findUnique')
        .mockResolvedValue(mockSetting as unknown as Setting);
      const error = {
        code: 'P2002',
        meta: { target: ['key'] },
      };
      jest.spyOn(prisma.setting, 'update').mockRejectedValue(error);
      await expect(
        service.update({ id: mockSetting.id }, { key: 'dup' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete and invalidate cache', async () => {
      jest
        .spyOn(prisma.setting, 'findUnique')
        .mockResolvedValue(mockSetting as unknown as Setting);
      jest
        .spyOn(prisma.setting, 'delete')
        .mockResolvedValue(mockSetting as unknown as Setting);
      const delSpy = jest.spyOn(cache, 'del').mockResolvedValue(1 as number);

      const result = await service.delete({ id: mockSetting.id });
      expect(result.id).toBe(mockSetting.id);
      expect(delSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFound when missing', async () => {
      jest.spyOn(prisma.setting, 'findUnique').mockResolvedValue(null);
      await expect(service.delete({ id: 'missing' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
