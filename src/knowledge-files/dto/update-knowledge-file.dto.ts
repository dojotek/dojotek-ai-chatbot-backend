import { PartialType } from '@nestjs/swagger';
import { CreateKnowledgeFileDto } from './create-knowledge-file.dto';

export class UpdateKnowledgeFileDto extends PartialType(
  CreateKnowledgeFileDto,
) {
  // All fields from CreateKnowledgeFileDto are now optional
  // This allows partial updates of knowledge file records
}
