import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateModelProviderSecretDto } from './dto/create-model-provider-secret.dto';
import { UpdateModelProviderSecretDto } from './dto/update-model-provider-secret.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigsService } from '../configs/configs.service';
import { InfisicalSDK } from '@infisical/sdk';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class ModelProviderSecretsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configs: ConfigsService,
  ) {}

  private async getInfisicalClient(): Promise<InfisicalSDK> {
    const client = new InfisicalSDK({ siteUrl: this.configs.infisicalSiteUrl });
    const clientId = this.configs.infisicalClientId;
    const clientSecret = this.configs.infisicalClientSecret;
    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Infisical credentials are not configured',
      );
    }
    await client.auth().universalAuth.login({ clientId, clientSecret });
    return client;
  }

  async create(dto: CreateModelProviderSecretDto) {
    // Create DB record first to get ID as pointer key
    const created = await this.prisma.modelProviderSecret.create({
      data: {
        name: dto.name,
        type: dto.type,
      },
    });

    try {
      const client = await this.getInfisicalClient();
      const environment = this.configs.infisicalEnvironment;
      const projectId = this.configs.infisicalProjectId;
      const secretPath = this.configs.infisicalModelProviderSecretsPath;

      const createdSecret = await client.secrets().createSecret(created.id, {
        environment,
        projectId,
        secretValue: dto.secret,
        secretComment: 'From Dojotek AI Chatbot backend',
        secretPath,
      });

      const updated = await this.prisma.modelProviderSecret.update({
        where: { id: created.id },
        data: {
          secretStoragePointer:
            (createdSecret as { secret?: { reference?: string } })?.secret
              ?.reference ?? created.id,
        },
      });
      return updated;
    } catch (err) {
      // Rollback DB record on failure to store secret
      await this.prisma.modelProviderSecret.delete({
        where: { id: created.id },
      });
      throw err;
    }
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.ModelProviderSecretWhereInput;
    orderBy?: Prisma.ModelProviderSecretOrderByWithRelationInput;
  }) {
    return this.prisma.modelProviderSecret.findMany({
      skip: params?.skip,
      take: params?.take,
      where: params?.where,
      orderBy: params?.orderBy ?? { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const found = await this.prisma.modelProviderSecret.findUnique({
      where: { id },
    });
    if (!found) {
      throw new NotFoundException('ModelProviderSecret not found');
    }
    return found;
  }

  async update(id: string, dto: UpdateModelProviderSecretDto) {
    const existing = await this.prisma.modelProviderSecret.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('ModelProviderSecret not found');
    }

    // If secret provided, update in Infisical
    const secretToUpdate = (dto as unknown as { secret?: string }).secret;
    if (secretToUpdate) {
      const client = await this.getInfisicalClient();
      const environment = this.configs.infisicalEnvironment;
      const projectId = this.configs.infisicalProjectId;
      const secretPath = this.configs.infisicalModelProviderSecretsPath;
      await client.secrets().createSecret(id, {
        environment,
        projectId,
        secretValue: secretToUpdate,
        secretComment: 'Updated from Dojotek AI Chatbot backend',
        secretPath,
      });
    }

    return this.prisma.modelProviderSecret.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.modelProviderSecret.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('ModelProviderSecret not found');
    }

    // Best-effort delete from Infisical
    try {
      const client = await this.getInfisicalClient();
      const environment = this.configs.infisicalEnvironment;
      const projectId = this.configs.infisicalProjectId;
      const secretPath = this.configs.infisicalModelProviderSecretsPath;
      await client
        .secrets()
        .deleteSecret(id, { environment, projectId, secretPath });
    } catch {
      // ignore errors from secret store
    }

    return this.prisma.modelProviderSecret.delete({ where: { id } });
  }
}
