import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigsService } from '../../configs/configs.service';
import {
  DeleteObjectParams,
  GetObjectStreamParams,
  IStorageService,
  PresignDownloadParams,
  PresignUploadParams,
  PresignUrlResult,
  PutObjectParams,
} from '../storage.interface';

@Injectable()
export class S3StorageAdapter implements IStorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(configsService: ConfigsService) {
    this.s3Client = new S3Client({
      region: configsService.awsRegion,
      credentials: {
        accessKeyId: configsService.awsAccessKeyId,
        secretAccessKey: configsService.awsSecretAccessKey,
      },
    });
    this.bucketName = configsService.s3BucketName;
  }

  async presignUpload(params: PresignUploadParams): Promise<PresignUrlResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: params.key,
      ContentType: params.contentType,
    });

    const expiresInSeconds = (params.expiresInMinutes || 60) * 60; // Default to 1 hour
    const presignedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      method: 'PUT',
      key: params.key,
      url: presignedUrl,
      expiresInMinutes: params.expiresInMinutes || 60,
    };
  }

  async presignDownload(
    params: PresignDownloadParams,
  ): Promise<PresignUrlResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: params.key,
    });

    const expiresInSeconds = (params.expiresInMinutes || 60) * 60; // Default to 1 hour
    const presignedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      method: 'GET',
      key: params.key,
      url: presignedUrl,
      expiresInMinutes: params.expiresInMinutes || 60,
    };
  }

  async putObject(params: PutObjectParams): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    });

    await this.s3Client.send(command);
  }

  async getObjectStream(
    params: GetObjectStreamParams,
  ): Promise<NodeJS.ReadableStream> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: params.key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error('Object not found or empty response body');
    }

    return response.Body as NodeJS.ReadableStream;
  }

  async deleteObject(params: DeleteObjectParams): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: params.key,
    });

    await this.s3Client.send(command);
  }
}
