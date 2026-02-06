# Classes Module Implementation Guide

## Overview

The Classes module has been successfully implemented into your NestJS backend architecture. This module manages the relationship between **Subjects**, **Sections**, and **Teachers** to form complete classes within the LMS system.

## Architecture Alignment

The implementation follows the established patterns in your codebase, aligning with:
- **Subjects Module**: Links subjects to classes
- **Sections Module**: Links student sections to classes
- **Users Module**: Links teachers to classes
- **Enrollments**: Students enroll in specific classes

## Module Structure

```
src/modules/classes/
├── DTO/
│   ├── create-class.dto.ts
│   └── update-class.dto.ts
├── classes.controller.ts
├── classes.service.ts
└── classes.module.ts
```

## Database Schema

The `classes` table structure:
```typescript
{
  id: uuid (Primary Key)
  subjectId: uuid (Foreign Key → subjects)
  sectionId: uuid (Foreign Key → sections)
  teacherId: uuid (Foreign Key → users)
  schedule: text (optional - e.g., "MWF 9:00-10:00")
  room: text (optional - e.g., "Room 101")
  schoolYear: text (required - e.g., "2024-2025")
  isActive: boolean (default: true)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Unique Constraint
- A class must have a unique combination of `(subjectId, sectionId, schoolYear)`
- This prevents duplicate classes for the same subject-section pair in the same academic year

## API Endpoints

### GET Endpoints

1. **Get All Classes (with filters)**
   ```
   GET /classes/all
   Query Parameters:
     - subjectId: string (optional)
     - sectionId: string (optional)
     - teacherId: string (optional)
     - schoolYear: string (optional)
     - isActive: boolean (optional)
     - search: string (optional)
     - page: number (default: 1)
     - limit: number (default: 50, max: 100)
   
   Roles: admin, teacher
   ```

2. **Get Class by ID**
   ```
   GET /classes/:id
   Roles: admin, teacher, student
   ```

3. **Get Classes by Teacher**
   ```
   GET /classes/teacher/:teacherId
   Returns: All classes taught by a specific teacher
   Roles: admin, teacher
   ```

4. **Get Classes by Section**
   ```
   GET /classes/section/:sectionId
   Returns: All classes assigned to a specific section
   Roles: admin, teacher
   ```

5. **Get Classes by Subject**
   ```
   GET /classes/subject/:subjectId
   Returns: All classes for a specific subject
   Roles: admin, teacher
   ```

### POST Endpoints

1. **Create Class**
   ```
   POST /classes
   Body:
   {
     "subjectId": "uuid",
     "sectionId": "uuid",
     "teacherId": "uuid",
     "schoolYear": "2024-2025",
     "schedule": "MWF 9:00-10:00" (optional),
     "room": "Room 101" (optional)
   }
   
   Roles: admin (only)
   ```

### PUT Endpoints

1. **Update Class**
   ```
   PUT /classes/:id
   Body: Any combination of updatable fields
   {
     "subjectId": "uuid" (optional),
     "sectionId": "uuid" (optional),
     "teacherId": "uuid" (optional),
     "schedule": "string" (optional),
     "room": "string" (optional),
     "isActive": boolean (optional)
   }
   
   Roles: admin (only)
   ```

2. **Toggle Class Active Status**
   ```
   PUT /classes/:id/toggle-status
   Toggles isActive between true and false
   Roles: admin (only)
   ```

### DELETE Endpoints

1. **Delete Class**
   ```
   DELETE /classes/:id
   Roles: admin (only)
   ```

## Service Methods

The `ClassesService` provides the following core methods:

### Query Methods
- `findAll(filters?)`: Get all classes with optional filtering
- `findById(id)`: Get a specific class by ID
- `getClassesByTeacher(teacherId)`: Get all classes for a teacher
- `getClassesBySection(sectionId)`: Get all classes for a section
- `getClassesBySubject(subjectId)`: Get all classes for a subject

### Mutation Methods
- `create(createClassDto)`: Create a new class
- `update(id, updateClassDto)`: Update an existing class
- `delete(id)`: Delete a class
- `toggleActive(id)`: Toggle the active status of a class

## Validation & Error Handling

### Create/Update Validation
- **Subject Validation**: Verifies subject exists
- **Section Validation**: Verifies section exists
- **Teacher Validation**: Verifies teacher exists
- **Duplicate Check**: Prevents duplicate classes (subject + section + school year)

### Error Responses
- `NotFoundException`: When class, subject, section, or teacher not found
- `ConflictException`: When class already exists with same subject/section/year
- `BadRequestException`: When foreign key references are invalid

## With Relations

The service automatically includes related data in responses:
- `subject`: Full subject information
- `section`: Full section information
- `teacher`: Teacher's firstName, lastName, email, and id

## Integration with App Module

The `ClassesModule` is registered in `app.module.ts`:
```typescript
import { ClassesModule } from './modules/classes/classes.module';

@Module({
  imports: [
    // ... other modules
    ClassesModule,
  ],
})
export class AppModule {}
```

## Usage Examples

### Create a Class
```bash
POST /classes
Content-Type: application/json

{
  "subjectId": "550e8400-e29b-41d4-a716-446655440000",
  "sectionId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "teacherId": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  "schoolYear": "2024-2025",
  "schedule": "MWF 9:00-10:00",
  "room": "Room 101"
}
```

### Get Classes by Teacher
```bash
GET /classes/teacher/6ba7b811-9dad-11d1-80b4-00c04fd430c8
```

### Get All Classes with Filters
```bash
GET /classes/all?sectionId=6ba7b810-9dad-11d1-80b4-00c04fd430c8&schoolYear=2024-2025&isActive=true
```

## Security

- All endpoints require JWT authentication via `JwtAuthGuard`
- Role-based access control via `RolesGuard`
- Admin-only operations: Create, Update, Delete
- Teacher/Student access: Read operations only

## Key Features

✅ **Full CRUD Operations**: Create, Read, Update, Delete classes
✅ **Filtering & Pagination**: Advanced filtering with pagination support
✅ **Relationship Management**: Proper handling of subject-section-teacher relationships
✅ **Validation**: Comprehensive validation of foreign keys and unique constraints
✅ **Error Handling**: Detailed error messages and appropriate HTTP status codes
✅ **Role-Based Access**: Fine-grained permission control
✅ **Audit Tracking**: Automatic creation and update timestamps

## Future Enhancements

Consider implementing:
- Class capacity tracking and enrollment limit validation
- Schedule conflict detection
- Batch import/export of classes
- Class statistics and analytics
- Advanced scheduling algorithms
- Integration with calendar systems

## Notes

- The classes module is now ready for frontend integration
- Ensure your frontend calls these endpoints with proper authentication
- The module supports pagination with a max limit of 100 per request
- All timestamps are in UTC (PostgreSQL default)
