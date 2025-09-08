import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ILogger } from './interfaces/logger.interface';
import { ConfigsService } from '../configs/configs.service';

@Injectable()
export class LogsService implements ILogger {
  constructor(
    private readonly pinoLogger: PinoLogger,
    private readonly configsService: ConfigsService,
  ) {}

  /**
   * Masks email addresses in a string for secure logging
   * Converts "user@example.com" to "u***@e***.com"
   */
  private maskEmail(text: string): string {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return text.replace(emailRegex, (email) => {
      const [localPart, domain] = email.split('@');
      const [domainName, ...tld] = domain.split('.');

      const maskedLocal =
        localPart.length > 1
          ? localPart[0] + '*'.repeat(Math.max(1, localPart.length - 1))
          : localPart;

      const maskedDomain =
        domainName.length > 1
          ? domainName[0] + '*'.repeat(Math.max(1, domainName.length - 1))
          : domainName;

      return `${maskedLocal}@${maskedDomain}.${tld.join('.')}`;
    });
  }

  /**
   * Masks phone numbers in a string for secure logging
   * Converts "+1234567890" to "+12*******0"
   */
  private maskPhoneNumber(text: string): string {
    // International phone number pattern
    const phoneRegex =
      /(\+?\d{1,3})?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
    return text.replace(phoneRegex, (phone) => {
      if (phone.length <= 4) return phone; // Too short to be a real phone number
      const cleaned = phone.replace(/[^\d+]/g, '');
      if (cleaned.length < 7) return phone; // Too short to be a real phone number

      const firstPart = cleaned.substring(0, 3);
      const lastPart = cleaned.substring(cleaned.length - 1);
      const middleMask = '*'.repeat(Math.max(1, cleaned.length - 4));

      return `${firstPart}${middleMask}${lastPart}`;
    });
  }

  /**
   * Masks credit card numbers in a string for secure logging
   * Converts "4111111111111111" to "4111-****-****-1111"
   */
  private maskCreditCard(text: string): string {
    const cardRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
    return text.replace(cardRegex, (card) => {
      const digits = card.replace(/[\s-]/g, '');
      if (digits.length === 16) {
        return `${digits.substring(0, 4)}-****-****-${digits.substring(12)}`;
      }
      return card;
    });
  }

  /**
   * Masks all types of PII data in a string
   */
  private maskAllPII(text: string): string {
    let masked = text;
    masked = this.maskEmail(masked);
    masked = this.maskPhoneNumber(masked);
    masked = this.maskCreditCard(masked);
    return masked;
  }

  /**
   * Masks sensitive data in any object or string for secure logging
   */
  private maskSensitiveData(data: unknown): unknown {
    if (typeof data === 'string') {
      return this.maskAllPII(data);
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.maskSensitiveData(item));
    }

    if (data && typeof data === 'object') {
      const masked = { ...data } as Record<string, unknown>;

      // List of keys that should be masked completely
      const sensitiveKeys = [
        'email',
        'emailAddress',
        'mail',
        'e_mail',
        'phone',
        'phoneNumber',
        'mobile',
        'cellphone',
        'tel',
        'creditCard',
        'cardNumber',
        'ccNumber',
        'card',
        'password',
        'pwd',
        'pass',
        'secret',
        'token',
        'key',
        'ssn',
        'socialSecurityNumber',
        'passport',
        'license',
      ];

      for (const key in masked) {
        if (Object.prototype.hasOwnProperty.call(masked, key)) {
          const value = masked[key];
          if (
            sensitiveKeys.includes(key.toLowerCase()) &&
            typeof value === 'string'
          ) {
            // Completely mask sensitive keys
            if (
              key.toLowerCase().includes('password') ||
              key.toLowerCase().includes('secret') ||
              key.toLowerCase().includes('token') ||
              key.toLowerCase().includes('key')
            ) {
              masked[key] = '[REDACTED]';
            } else {
              masked[key] = this.maskAllPII(value);
            }
          } else if (typeof value === 'string') {
            // Check if the value contains PII patterns
            masked[key] = this.maskAllPII(value);
          } else {
            masked[key] = this.maskSensitiveData(value);
          }
        }
      }

      return masked;
    }

    return data;
  }

  /**
   * Safely logs a message with automatic masking of sensitive data
   */
  logSafe(message: string, data?: unknown, context?: string): void {
    const maskedMessage = this.maskSensitiveData(message) as string;
    const maskedData = data ? this.maskSensitiveData(data) : undefined;

    // Ensure maskedData is an object before spreading
    const logData = {
      context: context || 'LogsService',
      ...(maskedData &&
      typeof maskedData === 'object' &&
      !Array.isArray(maskedData)
        ? (maskedData as Record<string, unknown>)
        : { data: maskedData }),
    };

    this.pinoLogger.info(logData, maskedMessage);
  }

  log(message: string, context?: string): void {
    this.pinoLogger.info(
      {
        context: context || 'LogsService',
      },
      message,
    );
  }

  error(message: string, trace?: string, context?: string): void {
    this.pinoLogger.error(
      {
        context: context || 'LogsService',
        trace,
      },
      message,
    );
  }

  warn(message: string, context?: string): void {
    this.pinoLogger.warn(
      {
        context: context || 'LogsService',
      },
      message,
    );
  }

  debug(message: string, context?: string): void {
    this.pinoLogger.debug(
      {
        context: context || 'LogsService',
      },
      message,
    );
  }
}
