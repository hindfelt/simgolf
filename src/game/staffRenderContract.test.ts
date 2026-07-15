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

  it('anchors staff art, shadows, bob, and labels to the shared actor geometry', () => {
    expect(renderSource).toContain('actorVisualGeometry(p, u, COURSE_STAFF_METRICS, bob)');
    expect(renderSource).toContain('actorWalkingBob(pose.phase, !pose.working, u, 1.05)');
    expect(renderSource).toContain('actorDrawPlan(p, COURSE_STAFF_METRICS');
    expect(renderSource).toContain('courseStaffSprite(kind, pose.frame, pose.view)');
    expect(renderSource).toContain('geometry.labelY');
    expect(renderSource).not.toContain('clamp(u, 0.65, 1.75) * 0.82');
  });

  it('uses one native golfer renderer for AI and manual-play characters', () => {
    expect(renderSource.match(/drawGolferSprite\(ctx/g)).toHaveLength(2);
    expect(renderSource).toContain('golferVisualGeometry({ x, y }, u, bob)');
    expect(renderSource).toContain('actorDrawPlan({ x, y }, GOLFER_METRICS');
    expect(renderSource).toContain('ctx.scale(plan.mirrorX ? -1 : 1, 1)');
    expect(renderSource).toContain('golferSprite(shirt, skin, cap, frame, view, identity, visualOverrides)');
    expect(renderSource).toContain('guestVisual?.identity ?? g.name');
    expect(renderSource).toContain('guestVisual,');
    expect(renderSource).toContain('manualGolferFacing(screenX, screenY, px, bp.x)');
    expect(renderSource).not.toContain('clamp(u, 0.65, 1.7) * 0.96');
  });

  it('bounds actor labels and restores ambient names only at native course zoom', () => {
    expect(renderSource).toContain('courseSafeViewport(S.view.w, S.view.h)');
    expect(renderSource).toContain("shouldShowActorName({ actor: 'staff', zoom: S.cam.z, hovered })");
    expect(renderSource).toContain("shouldShowActorName({ actor: 'golfer', zoom: S.cam.z, hovered, selected, special: !!g.specialGuest })");
    expect(renderSource).toContain('drawActorNameLabel(ctx, label, x, y, u');
  });
});
