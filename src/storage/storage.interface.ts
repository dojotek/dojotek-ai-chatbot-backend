export interface PresignUploadParams {
  key: string;
  contentType?: string;
  expiresInMinutes?: number;
}

export interface PresignDownloadParams {
  key: string;
  expiresInMinutes?: number;
}

export interface PresignUrlResult {
  method: 'GET' | 'PUT';
  key: string;
  url: string;
  expiresInMinutes?: number;
}

export interface PutObjectParams {
  key: string;
  body: Buffer | Uint8Array | import('stream').Readable;
  contentType?: string;
}

export interface GetObjectStreamParams {
  key: string;
}

export interface DeleteObjectParams {
  key: string;
}

export interface IStorageService {
  presignUpload(params: PresignUploadParams): Promise<PresignUrlResult>;
  presignDownload(params: PresignDownloadParams): Promise<PresignUrlResult>;
  putObject(params: PutObjectParams): Promise<void>;
  getObjectStream(
    params: GetObjectStreamParams,
  ): Promise<NodeJS.ReadableStream>;
  deleteObject(params: DeleteObjectParams): Promise<void>;
}
