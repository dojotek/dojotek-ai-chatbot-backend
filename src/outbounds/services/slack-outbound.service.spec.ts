import { Test, TestingModule } from '@nestjs/testing';
import { SlackOutboundService } from './slack-outbound.service';
import { ConfigsService } from '../../configs/configs.service';
import { LogsService } from '../../logs/logs.service';

let postMessageMock: jest.Mock;
const mockClientFactory = () => ({
  chat: { postMessage: postMessageMock },
});

jest.mock('@slack/web-api', () => {
  return {
    WebClient: jest.fn().mockImplementation(() => mockClientFactory()),
  };
});

describe('SlackOutboundService', () => {
  let service: SlackOutboundService;
  let logs: LogsService;
  let configs: { slackToken: string };

  beforeEach(async () => {
    postMessageMock = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlackOutboundService,
        {
          provide: ConfigsService,
          useValue: {
            getConfigWithDefault: jest.fn(),
            getRequiredConfig: jest.fn(),
            slackToken: '',
          },
        },
        { provide: LogsService, useValue: { error: jest.fn() } },
      ],
    }).compile();

    service = module.get(SlackOutboundService);
    logs = module.get(LogsService);
    configs = module.get(ConfigsService);
  });

  it('sends message successfully', async () => {
    configs.slackToken = 'xoxb-123';
    postMessageMock.mockResolvedValue({ ok: true });

    await service.send({ channel: 'C123', text: 'hello' });

    expect(postMessageMock).toHaveBeenCalledTimes(1);
    expect(postMessageMock).toHaveBeenCalledWith({
      channel: 'C123',
      text: 'hello',
    });
  });

  it('throws when SLACK_TOKEN is not configured', async () => {
    configs.slackToken = '';

    await expect(service.send({ channel: 'C123', text: 'hi' })).rejects.toThrow(
      'SLACK_TOKEN is not configured',
    );
  });

  it('logs and throws when Slack API returns not ok', async () => {
    configs.slackToken = 'xoxb-123';
    postMessageMock.mockResolvedValue({ ok: false, error: 'invalid_auth' });

    await expect(service.send({ channel: 'C1', text: 'test' })).rejects.toThrow(
      'Slack send failed',
    );
    expect(jest.spyOn(logs, 'error')).toHaveBeenCalled();
  });

  it('logs and rethrows when postMessage throws', async () => {
    configs.slackToken = 'xoxb-123';
    postMessageMock.mockRejectedValue(new Error('network'));

    await expect(service.send({ channel: 'C1', text: 'x' })).rejects.toThrow(
      'network',
    );
    expect(jest.spyOn(logs, 'error')).toHaveBeenCalled();
  });
});
