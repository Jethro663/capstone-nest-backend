import { Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { roles } from '../../drizzle/schema';

export type Role = typeof roles.$inferSelect;

@Injectable()
export class RolesService {
  constructor(private databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Look up a single role by name.
   * Input is normalised (trimmed + lowercased) to guard against
   * whitespace or casing inconsistencies from callers.
   */
  async findByName(name: string): Promise<Role | undefined> {
    const normalised = name.trim().toLowerCase();
    return this.db.query.roles.findFirst({
      where: eq(roles.name, normalised),
    });
  }

  /** Return every role in the system. */
  async findAll(): Promise<Role[]> {
    return this.db.query.roles.findMany();
  }

  /**
   * Resolve multiple role names in a single database query.
   * Prefer this over calling findByName() in a loop to avoid N+1 hits.
   * Each name is normalised before querying.
   */
  async findManyByNames(names: string[]): Promise<Role[]> {
    if (names.length === 0) return [];
    const normalised = names.map((n) => n.trim().toLowerCase());
    return this.db.query.roles.findMany({
      where: inArray(roles.name, normalised),
    });
  }
}
