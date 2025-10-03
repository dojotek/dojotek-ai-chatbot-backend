import { Test, TestingModule } from '@nestjs/testing';
import { ModelProviderSecretsController } from './model-provider-secrets.controller';
import { ModelProviderSecretsService } from './model-provider-secrets.service';
import { CreateModelProviderSecretDto } from './dto/create-model-provider-secret.dto';
import { UpdateModelProviderSecretDto } from './dto/update-model-provider-secret.dto';
type ModelProviderSecretRecord = {
  id: string;
  name: string;
  type: string;
  secretStoragePointer: string | null;
  createdAt: Date;
  updatedAt: Date;
};

describe('ModelProviderSecretsController', () => {
  let controller: ModelProviderSecretsController;
  let service: ModelProviderSecretsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModelProviderSecretsController],
      providers: [
        {
          provide: ModelProviderSecretsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ModelProviderSecretsController>(
      ModelProviderSecretsController,
    );
    service = module.get<ModelProviderSecretsService>(
      ModelProviderSecretsService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should call service', async () => {
    const dto: CreateModelProviderSecretDto = {
      name: 'OpenAI',
      type: 'openai',
      secret: 'sk-xxx',
    };
    const mockSecret: ModelProviderSecretRecord = {
      id: '1',
      name: 'OpenAI',
      type: 'openai',
      secretStoragePointer: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const createSpy = jest
      .spyOn(service, 'create')
      .mockResolvedValue(
        mockSecret as unknown as Awaited<ReturnType<typeof service.create>>,
      );
    const result = await controller.create(dto);
    expect(createSpy).toHaveBeenCalledWith(dto);
    expect(result).toBeDefined();
  });

  it('findAll should call service', async () => {
    const findAllSpy = jest.spyOn(service, 'findAll').mockResolvedValue([]);
    const result = await controller.findAll(
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(findAllSpy).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('findOne should call service', async () => {
    const mockSecret: ModelProviderSecretRecord = {
      id: '1',
      name: 'OpenAI',
      type: 'openai',
      secretStoragePointer: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const findOneSpy = jest
      .spyOn(service, 'findOne')
      .mockResolvedValue(
        mockSecret as unknown as Awaited<ReturnType<typeof service.findOne>>,
      );
    const result = await controller.findOne('1');
    expect(findOneSpy).toHaveBeenCalledWith('1');
    expect(result).toEqual(mockSecret);
  });

  it('update should call service', async () => {
    const updateDto = { name: 'X' } as UpdateModelProviderSecretDto;
    const mockSecret: ModelProviderSecretRecord = {
      id: '1',
      name: 'X',
      type: 'openai',
      secretStoragePointer: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updateSpy = jest
      .spyOn(service, 'update')
      .mockResolvedValue(
        mockSecret as unknown as Awaited<ReturnType<typeof service.update>>,
      );
    const result = await controller.update('1', updateDto);
    expect(updateSpy).toHaveBeenCalledWith('1', updateDto);
    expect(result).toEqual(mockSecret);
  });

  it('remove should call service', async () => {
    const mockSecret: ModelProviderSecretRecord = {
      id: '1',
      name: 'OpenAI',
      type: 'openai',
      secretStoragePointer: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const removeSpy = jest
      .spyOn(service, 'remove')
      .mockResolvedValue(
        mockSecret as unknown as Awaited<ReturnType<typeof service.remove>>,
      );
    await controller.remove('1');
    expect(removeSpy).toHaveBeenCalledWith('1');
  });
});
