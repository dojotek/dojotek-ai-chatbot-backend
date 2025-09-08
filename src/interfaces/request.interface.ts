import { Request } from 'express';
import { User } from '../generated/prisma/client';

/**
 * User type without password field for security purposes
 * Used when attaching user information to requests after authentication
 */
export type UserWithoutPassword = Omit<User, 'password'>;

/**
 * Extended Request interface that includes authenticated user information
 * This interface should be used in controllers that require authenticated user context
 *
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * async getProfile(@Request() req: RequestWithUser) {
 *   return req.user; // TypeScript knows this is UserWithoutPassword
 * }
 * ```
 */
export interface RequestWithUser extends Request {
  /**
   * Authenticated user information (without password for security)
   * This property is populated by authentication guards after successful authentication
   */
  user: UserWithoutPassword;
}
