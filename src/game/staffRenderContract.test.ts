import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const renderSource = readFileSync(new URL('./render.ts', import.meta.url), 'utf8');

describe('staff world-actor render contract', () => {
  it('queues every hired employee without a three-role visibility filter', () => {
    expect(renderSource).toContain('for (const employee of S.employees)');
    expect(renderSource).toContain('const staffKind = employee.kind');
    expect(renderSource).toContain('drawCourseStaff(ctx, staffKind, pose, u, employeeDisplayName(employee))');
    expect(renderSource).not.toMatch(/staffKind\s*!==\s*['"]ranger/);
  });

  it('depth-sorts named staff alongside golfers and course scenery', () => {
    expect(renderSource).toContain('z: dep(pose.x, pose.y) + 0.05');
    expect(renderSource).toContain('drawActorName(ctx, name');
    expect(renderSource).toContain('D.sort((a, b) => a.z - b.z)');
  });
});
