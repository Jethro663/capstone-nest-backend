import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { AcademicMutation } from '../../database/academic-transaction';
import {
  classRecordParticipants,
  classRecordScores,
  classRecordItems,
  classRecordFinalGrades,
  classRecords,
  enrollments,
  users,
} from '../../drizzle/schema';
import { AcademicPolicyService } from '../academic-state/academic-policy.service';
import { AuditService } from '../audit/audit.service';
import { ConfirmPeriodRosterDto } from './DTO/confirm-period-roster.dto';

/** Period eligibility is an explicit register, never reconstructed from today's enrollment. */
@Injectable()
export class ClassRecordRosterService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly policyService: AcademicPolicyService,
    private readonly auditService: AuditService,
  ) {}
  private get db() {
    return this.databaseService.db;
  }

  private async ownedRecord(id: string, actorId: string, roles: string[]) {
    const record = await this.db.query.classRecords.findFirst({
      where: eq(classRecords.id, id),
      with: { class: true },
    });
    if (!record) throw new NotFoundException('Class record not found');
    if (!roles.includes('admin') && record.class.teacherId !== actorId)
      throw new ForbiddenException('Access denied');
    return record;
  }

  async getRoster(id: string, actorId: string, roles: string[]) {
    const record = await this.ownedRecord(id, actorId, roles);
    const participants = await this.db.query.classRecordParticipants.findMany({
      where: eq(classRecordParticipants.classRecordId, id),
    });
    const membership = await this.db.query.enrollments.findMany({
      where: eq(enrollments.classId, record.classId),
    });
    const scored = await this.db
      .select({ studentId: classRecordScores.studentId })
      .from(classRecordScores)
      .innerJoin(
        classRecordItems,
        eq(classRecordScores.classRecordItemId, classRecordItems.id),
      )
      .where(eq(classRecordItems.classRecordId, id));
    const final = await this.db.query.classRecordFinalGrades.findMany({
      where: eq(classRecordFinalGrades.classRecordId, id),
    });
    const ids = [
      ...new Set(
        [...participants, ...membership, ...scored, ...final].map(
          (p) => p.studentId,
        ),
      ),
    ];
    const people = ids.length
      ? await this.db.query.users.findMany({
          where: inArray(users.id, ids),
          columns: { id: true, firstName: true, lastName: true },
          orderBy: (u, { asc }) => [asc(u.lastName), asc(u.firstName)],
        })
      : [];
    return {
      classRecordId: id,
      confirmedAt: record.rosterConfirmedAt,
      confirmedBy: record.rosterConfirmedBy,
      participants: people.map((person) => ({
        studentId: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        eligibility:
          participants.find((p) => p.studentId === person.id)?.eligibility ??
          null,
        reason:
          participants.find((p) => p.studentId === person.id)?.reason ?? null,
        source:
          participants.find((p) => p.studentId === person.id)?.source ?? null,
        currentlyEnrolled: membership.some(
          (p) => p.studentId === person.id && p.status === 'enrolled',
        ),
      })),
    };
  }

  @AcademicMutation()
  async confirm(
    id: string,
    dto: ConfirmPeriodRosterDto,
    actorId: string,
    roles: string[],
  ) {
    const record = await this.ownedRecord(id, actorId, roles);
    if (record.status !== 'draft')
      throw new ConflictException(
        'Reopen the class record before changing eligibility',
      );
    await this.policyService.assertAssessmentAction(
      { classId: record.classId, quarter: record.gradingPeriod },
      'prepare',
    );
    if (!dto.reason?.trim())
      throw new BadRequestException(
        'A reason is required for roster confirmation',
      );
    const current = await this.getRoster(id, actorId, roles);
    const candidates = new Set(current.participants.map((p) => p.studentId));
    const ids = new Set(dto.participants.map((p) => p.studentId));
    if (
      ids.size !== dto.participants.length ||
      ids.size !== candidates.size ||
      [...ids].some((id) => !candidates.has(id))
    )
      throw new BadRequestException(
        'Explicit eligibility is required for every class participant; enroll new participants first',
      );
    for (const entry of dto.participants) {
      if (
        !['eligible', 'not_enrolled', 'transferred', 'withdrawn'].includes(
          entry.eligibility,
        )
      )
        throw new BadRequestException('Invalid eligibility');
      if (entry.eligibility !== 'eligible' && !entry.reason?.trim())
        throw new BadRequestException(
          'A reason is required when excluding a participant',
        );
      const values = {
        classRecordId: id,
        studentId: entry.studentId,
        eligibility: entry.eligibility,
        reason: entry.reason?.trim() || dto.reason.trim(),
        source: 'confirmed_register',
        updatedBy: actorId,
        updatedAt: new Date(),
      };
      await this.db
        .insert(classRecordParticipants)
        .values(values)
        .onConflictDoUpdate({
          target: [
            classRecordParticipants.classRecordId,
            classRecordParticipants.studentId,
          ],
          set: values,
        });
    }
    await this.db
      .update(classRecords)
      .set({
        rosterConfirmedAt: new Date(),
        rosterConfirmedBy: actorId,
        updatedAt: new Date(),
      })
      .where(eq(classRecords.id, id));
    await this.auditService.log({
      actorId,
      action: 'class_record.roster.confirmed',
      targetType: 'class_record',
      targetId: id,
      metadata: {
        reason: dto.reason,
        before: current.participants,
        after: dto.participants,
      },
    });
    return this.getRoster(id, actorId, roles);
  }

  async assertEligible(classRecordId: string, studentIds: string[]) {
    const participants = await this.db.query.classRecordParticipants.findMany({
      where: and(
        eq(classRecordParticipants.classRecordId, classRecordId),
        eq(classRecordParticipants.eligibility, 'eligible'),
      ),
    });
    const eligible = new Set(participants.map((p) => p.studentId));
    if (studentIds.some((id) => !eligible.has(id)))
      throw new BadRequestException(
        'Confirm each student as eligible in this period roster before recording scores',
      );
  }
}
