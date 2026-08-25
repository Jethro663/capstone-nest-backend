import { ROLES_KEY, RoleName } from '../auth/decorators/roles.decorator';
import { AcademicStateController } from './academic-state.controller';

function method(name: keyof AcademicStateController) {
  return Object.getOwnPropertyDescriptor(
    AcademicStateController.prototype,
    name,
  )?.value;
}

describe('AcademicStateController role metadata', () => {
  it('allows Admin and Teacher to read the current state', () => {
    expect(Reflect.getMetadata(ROLES_KEY, method('getCurrent'))).toEqual([
      RoleName.Admin,
      RoleName.Teacher,
    ]);
  });

  it('keeps preview and transition Admin-only', () => {
    expect(Reflect.getMetadata(ROLES_KEY, method('getImpactPreview'))).toEqual([
      RoleName.Admin,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, method('transition'))).toEqual([
      RoleName.Admin,
    ]);
  });
});
