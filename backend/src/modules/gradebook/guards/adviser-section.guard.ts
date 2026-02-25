import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { gradebooks, classes, sections } from '../../../drizzle/schema';

/**
 * AdviserSectionGuard
 *
 * Allows access when either:
 *  - The authenticated user is an admin, OR
 *  - The authenticated user is the adviser of the section that owns the
 *    class referenced by the gradebook (sections.adviser_id = req.user.userId)
 *
 * Expects `gradebookId` in req.params.
 */
@Injectable()
export class AdviserSectionGuard implements CanActivate {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    // Admins bypass this guard
    if (user.roles?.includes('admin')) {
      return true;
    }

    const gradebookId: string = request.params.id ?? request.params.gradebookId;

    if (!gradebookId) {
      throw new ForbiddenException('Gradebook ID is required');
    }

    // Resolve: gradebook → class → section
    const gradebook = await this.db.query.gradebooks.findFirst({
      where: eq(gradebooks.id, gradebookId),
      with: {
        class: {
          with: {
            section: {
              columns: { id: true, adviserId: true },
            },
          },
        },
      },
    });

    if (!gradebook) {
      throw new NotFoundException(`Gradebook "${gradebookId}" not found`);
    }

    const adviserId = gradebook.class?.section?.adviserId;

    if (adviserId && adviserId === user.userId) {
      return true;
    }

    throw new ForbiddenException(
      'Access denied: you are not the adviser for this section',
    );
  }
}
