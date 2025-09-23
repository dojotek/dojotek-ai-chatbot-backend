import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { Prisma, Setting } from '../generated/prisma/client';

interface PrismaError {
  code: string;
  meta?: { target?: string[] };
}

function isPrismaError(error: unknown): error is PrismaError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private cachesService: CachesService,
    private configsService: ConfigsService,
  ) {}

  private generateCacheKey(
    operation: string,
    params: Prisma.SettingWhereUniqueInput,
  ): string {
    const prefix = this.configsService.cachePrefixSettings;
    const keyParts = [prefix, operation];
    if (params.id) keyParts.push(`id:${params.id}`);
    if (params.key) keyParts.push(`key:${params.key}`);
    return keyParts.join(':');
  }

  private redactIfSensitive(setting: Setting): Setting {
    if (!setting) return setting;
    if ((setting.category || '').toLowerCase() !== 'sensitive') return setting;
    const value = setting.value ?? '';
    if (value.length <= 2) {
      return { ...setting, value: value.replace(/.(?=.$)/g, '*') };
    }
    const first = value[0];
    const last = value[value.length - 1];
    // Use fixed-length redaction to avoid leaking the original length
    const masked = '****';
    return { ...setting, value: `${first}${masked}${last}` };
  }

  async findOne(
    where: Prisma.SettingWhereUniqueInput,
    redactSensitive = true,
  ): Promise<Setting | null> {
    const cacheKey = this.generateCacheKey('findOne', where);
    const cached = await this.cachesService.get<Setting>(cacheKey);
    if (cached) {
      return redactSensitive ? this.redactIfSensitive(cached) : cached;
    }

    const setting = await this.prisma.setting.findUnique({ where });
    if (setting) {
      await this.cachesService.set(
        cacheKey,
        setting,
        this.configsService.cacheTtlSettings,
      );
    }
    if (!setting) return null;
    return redactSensitive ? this.redactIfSensitive(setting) : setting;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.SettingWhereUniqueInput;
    where?: Prisma.SettingWhereInput;
    orderBy?: Prisma.SettingOrderByWithRelationInput;
    redactSensitive?: boolean;
  }): Promise<Setting[]> {
    const {
      skip,
      take,
      cursor,
      where,
      orderBy,
      redactSensitive = true,
    } = params;
    const settings = await this.prisma.setting.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
    return redactSensitive
      ? settings.map((s) => this.redactIfSensitive(s))
      : settings;
  }

  async create(createSettingDto: CreateSettingDto): Promise<Setting> {
    try {
      const setting = await this.prisma.setting.create({
        data: {
          key: createSettingDto.key,
          value: createSettingDto.value,
          description: createSettingDto.description,
          category: createSettingDto.category,
        },
      });

      // cache by id and key
      await this.cachesService.set(
        this.generateCacheKey('findOne', { id: setting.id }),
        setting,
        this.configsService.cacheTtlSettings,
      );
      await this.cachesService.set(
        this.generateCacheKey('findOne', { key: setting.key }),
        setting,
        this.configsService.cacheTtlSettings,
      );

      return setting;
    } catch (error) {
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }
      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }
      throw error;
    }
  }

  async update(
    where: Prisma.SettingWhereUniqueInput,
    updateSettingDto: UpdateSettingDto,
  ): Promise<Setting> {
    try {
      const existing = await this.prisma.setting.findUnique({ where });
      if (!existing) {
        throw new NotFoundException('Setting not found');
      }

      const updated = await this.prisma.setting.update({
        data: {
          key: updateSettingDto.key,
          value: updateSettingDto.value,
          description: updateSettingDto.description,
          category: updateSettingDto.category,
        },
        where,
      });

      // invalidate old caches
      await this.invalidateSettingCache(existing);
      // set new caches
      await this.cachesService.set(
        this.generateCacheKey('findOne', { id: updated.id }),
        updated,
        this.configsService.cacheTtlSettings,
      );
      await this.cachesService.set(
        this.generateCacheKey('findOne', { key: updated.key }),
        updated,
        this.configsService.cacheTtlSettings,
      );

      return updated;
    } catch (error) {
      if (isPrismaError(error) && error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(`${field} already exists`);
      }
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Setting not found');
      }
      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }
      throw error;
    }
  }

  async delete(where: Prisma.SettingWhereUniqueInput): Promise<Setting> {
    try {
      const toDelete = await this.prisma.setting.findUnique({ where });
      if (!toDelete) {
        throw new NotFoundException('Setting not found');
      }

      const deleted = await this.prisma.setting.delete({ where });
      await this.invalidateSettingCache(toDelete);
      return deleted;
    } catch (error) {
      if (isPrismaError(error) && error.code === 'P2025') {
        throw new NotFoundException('Setting not found');
      }
      if (isPrismaError(error) && error.code.startsWith('P')) {
        throw new InternalServerErrorException('Database operation failed');
      }
      throw error;
    }
  }

  private async invalidateSettingCache(setting: Setting): Promise<void> {
    const keys = [
      this.generateCacheKey('findOne', { id: setting.id }),
      this.generateCacheKey('findOne', { key: setting.key }),
    ];
    await Promise.all(keys.map((k) => this.cachesService.del(k)));
  }
}
