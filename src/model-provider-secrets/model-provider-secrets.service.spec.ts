import { Test, TestingModule } from '@nestjs/testing';
import { ModelProviderSecretsService } from './model-provider-secrets.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigsService } from '../configs/configs.service';

describe('ModelProviderSecretsService', () => {
  let service: ModelProviderSecretsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelProviderSecretsService,
        {
          provide: PrismaService,
          useValue: {
            modelProviderSecret: {
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ConfigsService,
          useValue: {
            infisicalSiteUrl: 'http://localhost:80',
            infisicalClientId: 'id',
            infisicalClientSecret: 'secret',
            infisicalEnvironment: 'dev',
            infisicalProjectId: 'dojotek-ai-chatbot-byok',
            infisicalModelProviderSecretsPath: '/MODEL_PROVIDER_SECRETS',
          },
        },
      ],
    }).compile();

    service = module.get<ModelProviderSecretsService>(
      ModelProviderSecretsService,
    );
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create should store db then secret', async () => {
    const created = { id: 'uuid', name: 'OpenAI', type: 'openai' } as const;
    const createSpy = jest
      .spyOn(prisma.modelProviderSecret, 'create')
      .mockResolvedValue(created as unknown as never);
    (prisma.modelProviderSecret.update as jest.Mock).mockImplementation(
      ({ data }: { data: { [key: string]: unknown } }) => ({
        ...created,
        ...data,
      }),
    );

    // Mock Infisical SDK via spying on internal method to avoid real login
    const clientMock = {
      auth: () => ({
        universalAuth: { login: jest.fn().mockResolvedValue({}) },
      }),
      secrets: () => ({
        createSecret: jest
          .fn()
          .mockResolvedValue({ secret: { reference: 'ref-uuid' } }),
      }),
    } as const;
    const spy = jest.spyOn(
      service as unknown as { getInfisicalClient: () => Promise<unknown> },
      'getInfisicalClient',
    );
    spy.mockResolvedValue(clientMock as unknown as Promise<unknown>);

    const result = await service.create({
      name: 'OpenAI',
      type: 'openai',
      secret: 'sk-xxx',
    });
    expect(createSpy).toHaveBeenCalled();
    expect(result.secretStoragePointer).toBe('ref-uuid');
  });

  it('findAll delegates to prisma', async () => {
    (prisma.modelProviderSecret.findMany as jest.Mock).mockResolvedValue([]);
    const result = await service.findAll({});
    expect(result).toEqual([]);
  });

  it('findOne throws if not found', async () => {
    (prisma.modelProviderSecret.findUnique as jest.Mock).mockResolvedValue(
      null,
    );
    await expect(service.findOne('x')).rejects.toThrow(
      'ModelProviderSecret not found',
    );
  });
});
