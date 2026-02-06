import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { roles } from '../../drizzle/schema';

@Injectable()
export class RolesService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  async findByName(name: string) {
    return this.db.query.roles.findFirst({
      where: eq(roles.name, name),
    });
  }

  async findAll() {
    return this.db.query.roles.findMany();
  }
}
