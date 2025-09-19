import { PartialType } from '@nestjs/swagger';
import { CreateChatAgentKnowledgeDto } from './create-chat-agent-knowledge.dto';

export class UpdateChatAgentKnowledgeDto extends PartialType(
  CreateChatAgentKnowledgeDto,
) {}
