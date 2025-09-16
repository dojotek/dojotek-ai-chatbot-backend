import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';

describe('RolesController', () => {
  let controller: RolesController;

  const mockRole: Role = {
    id: '01234567-89ab-cdef-0123-456789abcdef',
    name: 'admin',
    description: 'Administrator role with full access',
    permissions: { users: ['read', 'write'], roles: ['read'] },
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
  };

  const mockCreateRoleDto: CreateRoleDto = {
    name: 'admin',
    description: 'Administrator role with full access',
    permissions: { users: ['read', 'write'], roles: ['read'] },
  };

  const mockUpdateRoleDto: UpdateRoleDto = {
    description: 'Updated administrator role description',
  };

  const mockRolesService = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a role successfully', async () => {
      mockRolesService.create.mockResolvedValue(mockRole);

      const result = await controller.create(mockCreateRoleDto);

      expect(mockRolesService.create).toHaveBeenCalledWith(mockCreateRoleDto);
      expect(result).toEqual(mockRole);
    });

    it('should handle ConflictException when role name already exists', async () => {
      const conflictException = new ConflictException('name already exists');
      mockRolesService.create.mockRejectedValue(conflictException);

      await expect(controller.create(mockCreateRoleDto)).rejects.toThrow(
        conflictException,
      );
      expect(mockRolesService.create).toHaveBeenCalledWith(mockCreateRoleDto);
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockRolesService.create.mockRejectedValue(internalServerError);

      await expect(controller.create(mockCreateRoleDto)).rejects.toThrow(
        internalServerError,
      );
      expect(mockRolesService.create).toHaveBeenCalledWith(mockCreateRoleDto);
    });
  });

  describe('findAll', () => {
    it('should return all roles successfully without search parameters', async () => {
      const mockRoles = [mockRole];
      mockRolesService.findMany.mockResolvedValue(mockRoles);

      const result = await controller.findAll();

      expect(mockRolesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockRoles);
    });

    it('should return roles with pagination parameters', async () => {
      const mockRoles = [mockRole];
      mockRolesService.findMany.mockResolvedValue(mockRoles);

      const result = await controller.findAll(0, 5);

      expect(mockRolesService.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 5,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockRoles);
    });

    it('should return roles with search parameter', async () => {
      const mockRoles = [mockRole];
      mockRolesService.findMany.mockResolvedValue(mockRoles);

      const result = await controller.findAll(undefined, undefined, 'admin');

      expect(mockRolesService.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: 10,
        where: {
          OR: [
            { name: { contains: 'admin', mode: 'insensitive' } },
            { description: { contains: 'admin', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockRoles);
    });
  });

  describe('findOne', () => {
    it('should return a role by id successfully', async () => {
      mockRolesService.findOne.mockResolvedValue(mockRole);

      const result = await controller.findOne(
        '01234567-89ab-cdef-0123-456789abcdef',
      );

      expect(mockRolesService.findOne).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
      expect(result).toEqual(mockRole);
    });

    it('should return null when role is not found', async () => {
      mockRolesService.findOne.mockResolvedValue(null);

      const result = await controller.findOne('non-existent-id');

      expect(mockRolesService.findOne).toHaveBeenCalledWith({
        id: 'non-existent-id',
      });
      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should return a role by name successfully', async () => {
      mockRolesService.findOne.mockResolvedValue(mockRole);

      const result = await controller.findByName('admin');

      expect(mockRolesService.findOne).toHaveBeenCalledWith({
        name: 'admin',
      });
      expect(result).toEqual(mockRole);
    });

    it('should return null when role name is not found', async () => {
      mockRolesService.findOne.mockResolvedValue(null);

      const result = await controller.findByName('non-existent-role');

      expect(mockRolesService.findOne).toHaveBeenCalledWith({
        name: 'non-existent-role',
      });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a role successfully', async () => {
      const updatedRole = {
        ...mockRole,
        description: 'Updated administrator role description',
      };
      mockRolesService.update.mockResolvedValue(updatedRole);

      const result = await controller.update(
        '01234567-89ab-cdef-0123-456789abcdef',
        mockUpdateRoleDto,
      );

      expect(mockRolesService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateRoleDto,
      );
      expect(result).toEqual(updatedRole);
    });

    it('should handle NotFoundException when role is not found', async () => {
      const notFoundException = new NotFoundException('Role not found');
      mockRolesService.update.mockRejectedValue(notFoundException);

      await expect(
        controller.update('non-existent-id', mockUpdateRoleDto),
      ).rejects.toThrow(notFoundException);

      expect(mockRolesService.update).toHaveBeenCalledWith(
        { id: 'non-existent-id' },
        mockUpdateRoleDto,
      );
    });

    it('should handle ConflictException when role name already exists', async () => {
      const conflictException = new ConflictException('name already exists');
      mockRolesService.update.mockRejectedValue(conflictException);

      await expect(
        controller.update(
          '01234567-89ab-cdef-0123-456789abcdef',
          mockUpdateRoleDto,
        ),
      ).rejects.toThrow(conflictException);

      expect(mockRolesService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateRoleDto,
      );
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockRolesService.update.mockRejectedValue(internalServerError);

      await expect(
        controller.update(
          '01234567-89ab-cdef-0123-456789abcdef',
          mockUpdateRoleDto,
        ),
      ).rejects.toThrow(internalServerError);

      expect(mockRolesService.update).toHaveBeenCalledWith(
        { id: '01234567-89ab-cdef-0123-456789abcdef' },
        mockUpdateRoleDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete a role successfully', async () => {
      mockRolesService.delete.mockResolvedValue(undefined);

      const result = await controller.remove(
        '01234567-89ab-cdef-0123-456789abcdef',
      );

      expect(mockRolesService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
      expect(result).toBeUndefined();
    });

    it('should handle NotFoundException when role is not found', async () => {
      const notFoundException = new NotFoundException('Role not found');
      mockRolesService.delete.mockRejectedValue(notFoundException);

      await expect(controller.remove('non-existent-id')).rejects.toThrow(
        notFoundException,
      );
      expect(mockRolesService.delete).toHaveBeenCalledWith({
        id: 'non-existent-id',
      });
    });

    it('should handle ConflictException when role is being used by users', async () => {
      const conflictException = new ConflictException(
        'Cannot delete role as it is being used by users',
      );
      mockRolesService.delete.mockRejectedValue(conflictException);

      await expect(
        controller.remove('01234567-89ab-cdef-0123-456789abcdef'),
      ).rejects.toThrow(conflictException);

      expect(mockRolesService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
    });

    it('should handle InternalServerErrorException from service', async () => {
      const internalServerError = new InternalServerErrorException(
        'Database operation failed',
      );
      mockRolesService.delete.mockRejectedValue(internalServerError);

      await expect(
        controller.remove('01234567-89ab-cdef-0123-456789abcdef'),
      ).rejects.toThrow(internalServerError);

      expect(mockRolesService.delete).toHaveBeenCalledWith({
        id: '01234567-89ab-cdef-0123-456789abcdef',
      });
    });
  });
});
