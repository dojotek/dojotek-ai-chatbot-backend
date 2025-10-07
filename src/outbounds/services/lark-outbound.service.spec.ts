import { Test, TestingModule } from '@nestjs/testing';
import { LarkOutboundService } from './lark-outbound.service';
import { ConfigsService } from '../../configs/configs.service';
import { LogsService } from '../../logs/logs.service';

describe('LarkOutboundService', () => {
  let service: LarkOutboundService;
  let logs: LogsService;

  const fetchMock = jest.fn<Promise<Response>, [RequestInfo, RequestInit?]>();
  const originalFetch = global.fetch;

  beforeAll(() => {
    (global as unknown as { fetch: typeof fetch }).fetch =
      fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    (global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  });

  beforeEach(async () => {
    fetchMock.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LarkOutboundService,
        {
          provide: ConfigsService,
          useValue: {
            getConfigWithDefault: jest.fn((k: string, d: string) => {
              if (k === 'LARK_HOST') return 'https://open.feishu.cn';
              if (k === 'LARK_APP_ID') return 'app-id';
              if (k === 'LARK_APP_SECRET') return 'app-secret';
              return d;
            }),
          },
        },
        { provide: LogsService, useValue: { error: jest.fn() } },
      ],
    }).compile();

    service = module.get(LarkOutboundService);
    logs = module.get(LogsService);
  });

  it('authorizes and sends message successfully', async () => {
    // Token call
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tenant_access_token: 'token123' }),
        text: () => Promise.resolve(''),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      } as unknown as Response);

    await service.send({
      receiveIdType: 'open_id',
      receiveId: 'open_123',
      msgType: 'text',
      content: 'hello',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const tokenCall = fetchMock.mock.calls[0][0] as string;
    expect(tokenCall).toContain(
      '/open-apis/auth/v3/tenant_access_token/internal',
    );
    const sendCall = fetchMock.mock.calls[1][0] as string;
    expect(sendCall).toContain('/open-apis/im/v1/messages');
  });

  it('throws on token failure', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('err'),
    } as unknown as Response);
    await expect(
      service.send({
        receiveIdType: 'open_id',
        receiveId: 'open_123',
        msgType: 'text',
        content: 'hi',
      }),
    ).rejects.toThrow('Lark token request failed');
  });

  it('throws on send failure', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tenant_access_token: 'token123' }),
        text: () => Promise.resolve(''),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('bad'),
      } as unknown as Response);

    await expect(
      service.send({
        receiveIdType: 'open_id',
        receiveId: 'open_123',
        msgType: 'text',
        content: 'hi',
      }),
    ).rejects.toThrow('Lark send failed');
    expect(jest.spyOn(logs, 'error')).toHaveBeenCalled();
  });
});
