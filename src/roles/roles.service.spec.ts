import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { PrismaService } from '../prisma/prisma.service';
import { CachesService } from '../caches/caches.service';
import { ConfigsService } from '../configs/configs.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from '../generated/prisma/client';

describe('RolesService', () => {
  let service: RolesService;

  const mockRole: Role = {
    id: 'test-role-uuid-123',
    name: 'admin',
    description: 'Administrator role with full access',
    permissions: { users: ['read', 'write'], roles: ['read'] },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    role: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCachesService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getClient: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  const mockConfigsService = {
    cachePrefixRoles: 'roles',
    cacheTtlRoles: 3600,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CachesService,
          useValue: mockCachesService,
        },
        {
          provide: ConfigsService,
          useValue: mockConfigsService,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return cached role when found in cache', async () => {
      const whereInput = { id: 'test-role-uuid-123' };
      mockCachesService.get.mockResolvedValue(mockRole);

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockRole);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'roles:findOne:id:test-role-uuid-123',
      );
      expect(mockPrismaService.role.findUnique).not.toHaveBeenCalled();
    });

    it('should return role from database and cache it when not in cache', async () => {
      const whereInput = { id: 'test-role-uuid-123' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockCachesService.set.mockResolvedValue('OK');

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockRole);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'roles:findOne:id:test-role-uuid-123',
      );
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'roles:findOne:id:test-role-uuid-123',
        mockRole,
        3600,
      );
    });

    it('should return null when role not found and not cache null result', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockCachesService.get.mockResolvedValue(null);
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      const result = await service.findOne(whereInput);

      expect(result).toBeNull();
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'roles:findOne:id:non-existent-uuid',
      );
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockCachesService.set).not.toHaveBeenCalled();
    });

    it('should handle cache key generation for name lookup', async () => {
      const whereInput = { name: 'admin' };
      mockCachesService.get.mockResolvedValue(mockRole);

      const result = await service.findOne(whereInput);

      expect(result).toEqual(mockRole);
      expect(mockCachesService.get).toHaveBeenCalledWith(
        'roles:findOne:name:admin',
      );
    });
  });

  describe('findMany', () => {
    it('should return array of roles with default parameters', async () => {
      const roles = [mockRole];
      mockPrismaService.role.findMany.mockResolvedValue(roles);

      const result = await service.findMany({});

      expect(result).toEqual(roles);
      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        cursor: undefined,
        where: undefined,
        orderBy: undefined,
      });
    });

    it('should return array of roles with custom parameters', async () => {
      const roles = [mockRole];
      const params = {
        skip: 0,
        take: 10,
        cursor: { id: 'test-role-uuid-123' },
        where: { name: 'admin' },
        orderBy: { createdAt: 'desc' as const },
      };
      mockPrismaService.role.findMany.mockResolvedValue(roles);

      const result = await service.findMany(params);

      expect(result).toEqual(roles);
      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith(params);
    });
  });

  describe('create', () => {
    const createRoleDto: CreateRoleDto = {
      name: 'admin',
      description: 'Administrator role with full access',
      permissions: { users: ['read', 'write'], roles: ['read'] },
    };

    beforeEach(() => {
      mockCachesService.set.mockResolvedValue('OK');
    });

    it('should create a role and cache it', async () => {
      mockPrismaService.role.create.mockResolvedValue(mockRole);

      const result = await service.create(createRoleDto);

      expect(result).toEqual(mockRole);
      expect(mockPrismaService.role.create).toHaveBeenCalledWith({
        data: {
          name: 'admin',
          description: 'Administrator role with full access',
          permissions: { users: ['read', 'write'], roles: ['read'] },
        },
      });
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'roles:findOne:id:test-role-uuid-123',
        mockRole,
        3600,
      );
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'roles:findOne:name:admin',
        mockRole,
        3600,
      );
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const prismaError = {
        code: 'P2002',
        meta: { target: ['name'] },
      };
      mockPrismaService.role.create.mockRejectedValue(prismaError);

      await expect(service.create(createRoleDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createRoleDto)).rejects.toThrow(
        'name already exists',
      );
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.role.create.mockRejectedValue(prismaError);

      await expect(service.create(createRoleDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(createRoleDto)).rejects.toThrow(
        'Database operation failed',
      );
    });

    it('should re-throw non-Prisma errors', async () => {
      const error = new Error('Custom error');
      mockPrismaService.role.create.mockRejectedValue(error);

      await expect(service.create(createRoleDto)).rejects.toThrow(
        'Custom error',
      );
    });
  });

  describe('update', () => {
    const updateRoleDto: UpdateRoleDto = {
      name: 'updated-admin',
      description: 'Updated administrator role',
      permissions: { users: ['read', 'write', 'delete'], roles: ['read'] },
    };

    const updatedRole: Role = {
      ...mockRole,
      name: 'updated-admin',
      description: 'Updated administrator role',
      permissions: { users: ['read', 'write', 'delete'], roles: ['read'] },
    };

    beforeEach(() => {
      mockCachesService.set.mockResolvedValue('OK');
      mockCachesService.del.mockResolvedValue(1);
    });

    it('should update a role and update cache', async () => {
      const whereInput = { id: 'test-role-uuid-123' };
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.role.update.mockResolvedValue(updatedRole);

      const result = await service.update(whereInput, updateRoleDto);

      expect(result).toEqual(updatedRole);
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockPrismaService.role.update).toHaveBeenCalledWith({
        where: whereInput,
        data: {
          name: 'updated-admin',
          description: 'Updated administrator role',
          permissions: { users: ['read', 'write', 'delete'], roles: ['read'] },
        },
      });
      // Check cache invalidation
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'roles:findOne:id:test-role-uuid-123',
      );
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'roles:findOne:name:admin',
      );
      // Check new cache entries
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'roles:findOne:id:test-role-uuid-123',
        updatedRole,
        3600,
      );
      expect(mockCachesService.set).toHaveBeenCalledWith(
        'roles:findOne:name:updated-admin',
        updatedRole,
        3600,
      );
    });

    it('should throw NotFoundException when role not found', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.update(whereInput, updateRoleDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(whereInput, updateRoleDto)).rejects.toThrow(
        'Role not found',
      );
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const whereInput = { id: 'test-role-uuid-123' };
      const prismaError = {
        code: 'P2002',
        meta: { target: ['name'] },
      };
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.role.update.mockRejectedValue(prismaError);

      await expect(service.update(whereInput, updateRoleDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(whereInput, updateRoleDto)).rejects.toThrow(
        'name already exists',
      );
    });

    it('should throw NotFoundException on record not found during update', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      const prismaError = {
        code: 'P2025',
        meta: {},
      };
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.role.update.mockRejectedValue(prismaError);

      await expect(service.update(whereInput, updateRoleDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(whereInput, updateRoleDto)).rejects.toThrow(
        'Role not found',
      );
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const whereInput = { id: 'test-role-uuid-123' };
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.role.update.mockRejectedValue(prismaError);

      await expect(service.update(whereInput, updateRoleDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.update(whereInput, updateRoleDto)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      mockCachesService.del.mockResolvedValue(1);
    });

    it('should delete a role successfully and invalidate cache', async () => {
      const whereInput = { id: 'test-role-uuid-123' };
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.role.delete.mockResolvedValue(mockRole);

      const result = await service.delete(whereInput);

      expect(result).toEqual(mockRole);
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: whereInput,
      });
      expect(mockPrismaService.role.delete).toHaveBeenCalledWith({
        where: whereInput,
      });
      // Check cache invalidation
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'roles:findOne:id:test-role-uuid-123',
      );
      expect(mockCachesService.del).toHaveBeenCalledWith(
        'roles:findOne:name:admin',
      );
    });

    it('should throw NotFoundException when role not found', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.delete(whereInput)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Role not found',
      );
    });

    it('should throw NotFoundException on record not found during delete', async () => {
      const whereInput = { id: 'non-existent-uuid' };
      const prismaError = {
        code: 'P2025',
        meta: {},
      };
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.role.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Role not found',
      );
    });

    it('should throw ConflictException on foreign key constraint violation', async () => {
      const whereInput = { id: 'test-role-uuid-123' };
      const prismaError = {
        code: 'P2003',
        meta: {},
      };
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.role.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Cannot delete role as it is being used by users',
      );
    });

    it('should throw InternalServerErrorException on other Prisma errors', async () => {
      const whereInput = { id: 'test-role-uuid-123' };
      const prismaError = {
        code: 'P1001',
        meta: {},
      };
      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.role.delete.mockRejectedValue(prismaError);

      await expect(service.delete(whereInput)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.delete(whereInput)).rejects.toThrow(
        'Database operation failed',
      );
    });
  });
});
