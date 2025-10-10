import { Injectable } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { ConfigsService } from '../../configs/configs.service';
import { LogsService } from '../../logs/logs.service';

type SendParams = {
  // Slack channel ID, e.g. C123... for channels, D123... for IMs
  channel: string;
  // Optional plain text to send
  text?: string;
};

@Injectable()
export class SlackOutboundService {
  constructor(
    private readonly configs: ConfigsService,
    private readonly logs: LogsService,
  ) {}

  private getClient(): WebClient {
    const token = this.configs.slackToken;
    if (!token) {
      throw new Error('SLACK_TOKEN is not configured');
    }
    return new WebClient(token);
  }

  async send(params: SendParams): Promise<void> {
    const client = this.getClient();

    try {
      const response = await client.chat.postMessage({
        channel: params.channel,
        text: params.text ?? '',
      });

      if (!response.ok) {
        this.logs.error(
          'Slack send message failed',
          JSON.stringify(response),
          'SlackOutboundService',
        );
        throw new Error('Slack send failed');
      }
    } catch (error: unknown) {
      const trace: string | undefined =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : undefined;

      this.logs.error(
        'Slack send message threw error',
        trace ?? 'Unknown error',
        'SlackOutboundService',
      );
      throw error;
    }
  }
}
