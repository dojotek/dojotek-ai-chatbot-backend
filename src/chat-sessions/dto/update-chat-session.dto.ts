import { PartialType } from '@nestjs/swagger';
import { CreateChatSessionDto } from './create-chat-session.dto';

export class UpdateChatSessionDto extends PartialType(CreateChatSessionDto) {
  // All fields from CreateChatSessionDto are now optional
  // chatAgentId, customerStaffId, platform, platformThreadId, sessionData, status, expiresAt can all be updated
}
