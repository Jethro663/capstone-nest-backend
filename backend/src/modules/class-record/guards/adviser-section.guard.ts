import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { classRecords, classes, sections } from '../../../drizzle/schema';

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

    if (user.roles?.includes('admin')) {
      return true;
    }

    const classRecordId: string =
      request.params.id ?? request.params.classRecordId;

    if (!classRecordId) {
      throw new ForbiddenException('Class record ID is required');
    }

    const record = await this.db.query.classRecords.findFirst({
      where: eq(classRecords.id, classRecordId),
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

    if (!record) {
      throw new NotFoundException(`Class record "${classRecordId}" not found`);
    }

    const adviserId = record.class?.section?.adviserId;

    if (adviserId && adviserId === user.userId) {
      return true;
    }

    throw new ForbiddenException(
      'Access denied: you are not the adviser for this section',
    );
  }
}
