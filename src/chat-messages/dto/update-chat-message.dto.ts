import { PartialType } from '@nestjs/swagger';
import { CreateChatMessageDto } from './create-chat-message.dto';

export class UpdateChatMessageDto extends PartialType(CreateChatMessageDto) {
  // All fields from CreateChatMessageDto are now optional
  // chatSessionId, messageType, content, metadata, platformMessageId can all be updated
}
