# Appendix: Templates

Load this only when a compact starting shape is needed.

## Backend Controller Shape

```ts
@Controller('resource')
@UseGuards(RolesGuard)
export class ResourceController {
  constructor(private readonly service: ResourceService) {}

  @Post()
  @Roles(RoleName.Admin, RoleName.Teacher)
  async create(@Body() dto: CreateResourceDto, @CurrentUser() user: JwtPayload) {
    const data = await this.service.create(dto, user.id);
    return { success: true, message: 'Resource created.', data };
  }
}
```

## Backend Service Shape

```ts
@Injectable()
export class ResourceService {
  constructor(private readonly databaseService: DatabaseService) {}
  private get db() { return this.databaseService.db; }
}
```

## Frontend Service Shape

```ts
export const resourceService = {
  async getAll(params?: Query) {
    const { data } = await api.get('/resources', { params });
    return data;
  },
};
```

## Frontend Page Shape

```tsx
'use client';

export default function ResourcePage() {
  // Load through src/services/*, not raw axios in the page.
}
```
