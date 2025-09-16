import { PartialType } from '@nestjs/swagger';
import { CreateChatAgentDto } from './create-chat-agent.dto';

export class UpdateChatAgentDto extends PartialType(CreateChatAgentDto) {}
