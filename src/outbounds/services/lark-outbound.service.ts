import { Injectable } from '@nestjs/common';
import { ConfigsService } from '../../configs/configs.service';
import { LogsService } from '../../logs/logs.service';

type SendParams = {
  receiveIdType: 'open_id';
  receiveId: string;
  msgType: 'text';
  content: string;
};

@Injectable()
export class LarkOutboundService {
  private tenantAccessToken: string | null = null;

  constructor(
    private readonly configs: ConfigsService,
    private readonly logs: LogsService,
  ) {}

  private async authorizeTenantAccessToken(): Promise<void> {
    const host = this.configs.getConfigWithDefault(
      'LARK_HOST',
      'https://open.feishu.cn',
    );
    const appId = this.configs.getConfigWithDefault('LARK_APP_ID', '');
    const appSecret = this.configs.getConfigWithDefault('LARK_APP_SECRET', '');

    const url = `${host}/open-apis/auth/v3/tenant_access_token/internal`;
    const body = { app_id: appId, app_secret: appSecret } as Record<
      string,
      string
    >;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Lark token request failed: ${resp.status} ${text}`);
    }
    const json = (await resp.json()) as Record<string, unknown>;
    const token = (json['tenant_access_token'] as string) || '';
    if (!token) {
      throw new Error('Missing tenant_access_token in Lark response');
    }
    this.tenantAccessToken = token;
  }

  async send(params: SendParams): Promise<void> {
    if (!this.tenantAccessToken) {
      await this.authorizeTenantAccessToken();
    }

    const host = this.configs.getConfigWithDefault(
      'LARK_HOST',
      'https://open.feishu.cn',
    );
    const url = `${host}/open-apis/im/v1/messages?receive_id_type=${params.receiveIdType}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.tenantAccessToken}`,
    } as Record<string, string>;

    const body = {
      receive_id: params.receiveId,
      content: JSON.stringify({ text: params.content }),
      msg_type: params.msgType,
    } as Record<string, unknown>;

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      this.logs.error('Lark send message failed', text, 'LarkOutboundService');
      throw new Error(`Lark send failed: ${resp.status}`);
    }
  }
}
