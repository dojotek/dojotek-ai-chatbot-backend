import { Injectable } from '@nestjs/common';
import { LogsService } from '../logs/logs.service';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { ChatMessage } from '../generated/prisma/client';

@Injectable()
export class ChatAgentInferencesService {
  constructor(private readonly logsService: LogsService) {}

  async runChatAgent(systemPrompt: string, recentMessages: ChatMessage[] = []) {
    const model = new ChatOpenAI({ model: 'gpt-4' });

    // Build messages array starting with system prompt
    const messages = [new SystemMessage(systemPrompt)];

    // Add recent conversation history
    for (const message of recentMessages) {
      if (message.messageType === 'user') {
        messages.push(new HumanMessage(message.content));
      } else if (message.messageType === 'ai') {
        messages.push(new AIMessage(message.content));
      }
      // Skip system messages in history to avoid conflicts
    }

    this.logsService.debug(
      `Running chat agent with ${messages.length} messages (${recentMessages.length} history messages)`,
      'ChatAgentInferencesService',
    );

    const result = await model.invoke(messages);

    const responseContent = result.content.toString(); // eslint-disable-line @typescript-eslint/no-base-to-string

    this.logsService.log(
      `LLM response: ${responseContent}`,
      'ChatAgentInferencesService',
    );

    return responseContent;
  }
}
