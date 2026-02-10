import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Put,
  Delete,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './DTO/create-user.dto';
import { UpdateUserDto } from './DTO/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('token')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Get Commands
  @Get('all')
  @Roles('admin')
  async getAllUsers(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const users = await this.usersService.findAll({
      role,
      status,
      page,
      limit,
    });
    return {
      success: true,
      users: [...users],
    };
  }

  @Get(':id')
  @Roles('admin')
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);

    return {
      success: true,
      data: { user },
    };
  }

  //Crud Operations

  @Post('create')
  @Roles('admin') // Only admins can create users
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);

    return {
      success: true,
      message: 'User created successfully. Verification email sent.',
      data: { user },
    };
  }

  @Put('update/:id')
  @Roles('admin')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updatedUser = await this.usersService.updateUser(id, updateUserDto);

    return {
      success: true,
      message: 'User updated successfully.',
      data: { user: updatedUser },
    };
  }

  // Legacy soft-delete endpoint (kept for backward compatibility)
  @Delete('delete/:id')
  @Roles('admin')
  async deleteUser(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
    return {
      success: true,
      message: 'User set to DELETED',
    };
  }

  // ==========================================
  // USER LIFECYCLE ENDPOINTS
  // ==========================================

  /**
   * Suspend a user — ACTIVE/PENDING → SUSPENDED
   * Data is fully preserved. User loses login access.
   */
  @Patch(':id/suspend')
  @Roles('admin')
  async suspendUser(@Param('id') id: string, @CurrentUser() admin: any) {
    const result = await this.usersService.suspendUser(id, admin.sub || admin.id);
    return { success: true, ...result };
  }

  /**
   * Reactivate a suspended user — SUSPENDED → ACTIVE
   */
  @Patch(':id/reactivate')
  @Roles('admin')
  async reactivateUser(@Param('id') id: string, @CurrentUser() admin: any) {
    const result = await this.usersService.reactivateUser(id, admin.sub || admin.id);
    return { success: true, ...result };
  }

  /**
   * Soft-delete with archival — SUSPENDED → DELETED
   * Archives all user data into archived_users table before marking DELETED.
   */
  @Delete(':id/soft-delete')
  @Roles('admin')
  async softDeleteUser(@Param('id') id: string, @CurrentUser() admin: any) {
    const result = await this.usersService.softDeleteUser(id, admin.sub || admin.id);
    return { success: true, ...result };
  }

  /**
   * Export user data as JSON — downloadable archive before purge.
   */
  @Get(':id/export')
  @Roles('admin')
  async exportUserData(@Param('id') id: string, @Res() res: Response) {
    const data = await this.usersService.exportUserData(id);
    const filename = `user-export-${id}-${Date.now()}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2));
  }

  /**
   * Permanently purge a user — DELETED → removed from DB.
   * CASCADE deletes all related records. Archive snapshot is preserved.
   */
  @Delete(':id/purge')
  @Roles('admin')
  async purgeUser(@Param('id') id: string, @CurrentUser() admin: any) {
    const result = await this.usersService.purgeUser(id, admin.sub || admin.id);
    return { success: true, ...result };
  }
}
