import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { RosterImportService } from './roster-import.service';
import { RosterFileValidationPipe } from './pipes/roster-file-validation.pipe';
import {
  RosterImportCommitDto,
  ResolvePendingRowDto,
} from './dto/roster-import.dto';
import { Roles, RoleName } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  MAX_ROSTER_FILE_SIZE_BYTES,
  UPLOAD_DEST_ROSTER,
} from './constants/roster-import.constants';

// ─── Multer config ─────────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);

const multerOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(UPLOAD_DEST_ROSTER, { recursive: true });
      cb(null, UPLOAD_DEST_ROSTER);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}_${Date.now()}${ext}`);
    },
  }),
  limits: {
    fileSize: MAX_ROSTER_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    // Coarse extension pre-filter; the validation pipe does the real check
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      // Pass the file through so the pipe can generate a proper HTTP exception
      cb(null, false);
    }
  },
};

// ─── Controller ────────────────────────────────────────────────────────────────

@ApiTags('Roster Import')
@ApiBearerAuth()
@Roles(RoleName.Admin, RoleName.Teacher)
@Controller('roster-import')
export class RosterImportController {
  constructor(private readonly rosterImportService: RosterImportService) {}

  /**
   * POST /api/roster-import/:sectionId/preview
   *
   * Accepts a CSV or XLSX roster file, parses it, validates each row, and
   * returns a full preview (registered students, pending students, errors)
   * WITHOUT writing anything to the database.
   *
   * The temp file is automatically cleaned up after parsing.
   */
  @Post(':sectionId/preview')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async preview(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @UploadedFile(new RosterFileValidationPipe()) file: Express.Multer.File,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.rosterImportService.parseAndPreview(sectionId, file, user);
  }

  /**
   * POST /api/roster-import/:sectionId/commit
   *
   * Commits the approved roster payload returned by the preview endpoint:
   *  - Enrolls registered students into the section.
   *  - Inserts unregistered students into the pending_roster table.
   *
   * No file upload required — the frontend re-sends the approved row data as JSON.
   */
  @Post(':sectionId/commit')
  @HttpCode(HttpStatus.CREATED)
  async commit(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: RosterImportCommitDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.rosterImportService.commitRoster(sectionId, dto, user);
  }

  /**
   * GET /api/roster-import/:sectionId/pending
   *
   * Returns all pending (unregistered) roster entries for a given section.
   */
  @Get(':sectionId/pending')
  async getPending(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.rosterImportService.getPendingRoster(sectionId, user);
  }

  /**
   * PATCH /api/roster-import/pending/:id/resolve
   *
   * Links (or un-links) a pending roster row to a registered LMS user.
   * Supply { resolvedUserId } to claim the row; omit it to clear the resolution.
   */
  @Patch('pending/:id/resolve')
  async resolvePending(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolvePendingRowDto,
    @CurrentUser() user: { id: string; email: string; roles: string[] },
  ) {
    return this.rosterImportService.resolvePendingRow(
      id,
      dto.resolvedUserId,
      user,
    );
  }
}
