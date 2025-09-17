import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { createHash } from 'crypto';
import { CachesService } from '../../caches/caches.service';
import { LogsService } from '../../logs/logs.service';
import { ChatSessionsService } from '../../chat-sessions/chat-sessions.service';
import { ChatMessagesService } from '../../chat-messages/chat-messages.service';
import { ConfigsService } from '../../configs/configs.service';
import { ChatAgentsService } from '../../chat-agents/chat-agents.service';
import { CustomersService } from '../../customers/customers.service';
import { CustomerStaffsService } from '../../customer-staffs/customer-staffs.service';
import { SubmitDto } from '../dto/submit.dto';
import { MessageType } from '../../chat-messages/dto/create-chat-message.dto';

@Injectable()
export class SampleInboundService {
  constructor(
    private readonly cachesService: CachesService,
    private readonly logsService: LogsService,
    private readonly chatSessionsService: ChatSessionsService,
    private readonly chatMessagesService: ChatMessagesService,
    private readonly configsService: ConfigsService,
    private readonly chatAgentsService: ChatAgentsService,
    private readonly customersService: CustomersService,
    private readonly customerStaffsService: CustomerStaffsService,
    @InjectQueue('inbounds/sample/v2025.09.05') private sampleQueue: Queue,
    @InjectQueue('inbounds/sample') private queue: Queue,
  ) {}

  async sampleSubmit() {
    this.logsService.debug(
      'Starting sample inbound submission process',
      'SampleInboundService',
    );

    try {
      this.logsService.log(
        'Setting cache value for sample inbound',
        'SampleInboundService',
      );
      await this.cachesService.set('inbounds/sample/v2025.09.05', 'hello', 60);

      this.logsService.log(
        'Adding job to queue for processing',
        'SampleInboundService',
      );
      await this.sampleQueue.add('submit', {
        message: 'hello',
        timestamp: new Date().toISOString(),
        service: 'sample-inbound',
      });

      this.logsService.log(
        'Sample inbound submission completed successfully',
        'SampleInboundService',
      );
      return 'OK';
    } catch (error) {
      this.logsService.error(
        'Failed to submit sample inbound request',
        error instanceof Error ? error.stack : String(error),
        'SampleInboundService',
      );
      throw error;
    }
  }

  async submit(submitDto: SubmitDto) {
    const { chatAgentId, customerId, customerStaffId, platform, message } =
      submitDto;

    this.logsService.debug(
      'Starting inbound message submission process',
      'SampleInboundService',
    );

    try {
      // Generate deduplication key
      const deduplicationKey = this.generateDeduplicationKey(
        chatAgentId,
        customerId,
        customerStaffId,
        platform,
        message,
      );

      // Check for duplicate message
      const existingMessage = await this.cachesService.get(deduplicationKey);
      if (existingMessage) {
        this.logsService.log(
          `Duplicate message detected for key: ${deduplicationKey}. Discarding.`,
          'SampleInboundService',
        );
        return { status: 'duplicate', message: 'Message already processed' };
      }

      // Validate required entities exist
      this.logsService.log(
        'Validating chat agent, customer, and customer staff existence',
        'SampleInboundService',
      );

      // Check if chat agent exists
      const chatAgent = await this.chatAgentsService.findOne({
        id: chatAgentId,
      });
      if (!chatAgent) {
        this.logsService.error(
          `Chat agent not found with ID: ${chatAgentId}`,
          'Chat agent validation failed',
          'SampleInboundService',
        );
        return {
          status: 'error',
          message: 'Chat agent not found',
          code: 'CHAT_AGENT_NOT_FOUND',
        };
      }

      // Check if customer exists
      const customer = await this.customersService.findOne({ id: customerId });
      if (!customer) {
        this.logsService.error(
          `Customer not found with ID: ${customerId}`,
          'Customer validation failed',
          'SampleInboundService',
        );
        return {
          status: 'error',
          message: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND',
        };
      }

      // Check if customer staff exists
      const customerStaff = await this.customerStaffsService.findOne({
        id: customerStaffId,
      });
      if (!customerStaff) {
        this.logsService.error(
          `Customer staff not found with ID: ${customerStaffId}`,
          'Customer staff validation failed',
          'SampleInboundService',
        );
        return {
          status: 'error',
          message: 'Customer staff not found',
          code: 'CUSTOMER_STAFF_NOT_FOUND',
        };
      }

      this.logsService.log(
        'All entities validated successfully',
        'SampleInboundService',
      );

      // Set deduplication cache entry
      await this.cachesService.set(
        deduplicationKey,
        'processed',
        this.configsService.inboundChatDeduplicationTtlSample,
      );

      this.logsService.log(
        'Getting or creating chat session',
        'SampleInboundService',
      );

      // Get or create chat session
      const chatSessionId =
        await this.chatSessionsService.getInboundChatSessionId(
          chatAgentId,
          customerId,
          customerStaffId,
          platform,
        );

      this.logsService.log(
        `Using chat session ID: ${chatSessionId}`,
        'SampleInboundService',
      );

      // Create chat message
      const chatMessage = await this.chatMessagesService.create({
        chatSessionId,
        messageType: MessageType.USER,
        content: message,
        platformMessageId: `${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });

      this.logsService.log(
        `Created chat message with ID: ${chatMessage.id}`,
        'SampleInboundService',
      );

      // Add job to queue for processing
      await this.queue.add('process-inbound-message', {
        chatSessionId,
        chatMessageId: chatMessage.id,
        chatAgentId,
        customerId,
        customerStaffId,
        platform,
        message,
        timestamp: new Date().toISOString(),
        service: 'sample-inbound',
      });

      this.logsService.log(
        'Inbound message submission completed successfully',
        'SampleInboundService',
      );

      return {
        status: 'success',
        chatAgentId,
        chatSessionId,
        chatMessageId: chatMessage.id,
        message: 'Message processed successfully',
      };
    } catch (error) {
      this.logsService.error(
        'Failed to submit inbound message',
        error instanceof Error ? error.stack : String(error),
        'SampleInboundService',
      );
      throw error;
    }
  }

  simulateWarning() {
    this.logsService.warn(
      'This is a sample warning message for demonstration',
      'SampleInboundService',
    );
    return 'Warning logged';
  }

  simulateError() {
    this.logsService.error(
      'This is a sample error message for demonstration',
      'Error stack trace would go here',
      'SampleInboundService',
    );
    return 'Error logged';
  }

  simulateDebug() {
    this.logsService.debug(
      'This is a sample debug message for demonstration',
      'SampleInboundService',
    );
    return 'Debug logged';
  }

  /**
   * Generate deduplication key for incoming messages
   */
  private generateDeduplicationKey(
    chatAgentId: string,
    customerId: string,
    customerStaffId: string,
    platform: string,
    message: string,
  ): string {
    // Create a proper SHA-256 hash of the message content
    const messageHash = createHash('sha256')
      .update(message, 'utf8')
      .digest('hex')
      .substring(0, 16); // Use first 16 characters of the hex hash for brevity

    return `inbound:dedup:${chatAgentId}:${customerId}:${customerStaffId}:${platform}:${messageHash}`;
  }
}
