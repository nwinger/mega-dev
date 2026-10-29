// The problems inside a merged ticket. Pages explain them; this file is what runs.

// A problem is the report's cause by tenant (causes.ts), with one exception: the reports the desk
// read as a one-day move (desk-notes.json). A day/month swap cannot move a date by one day, so those
// are a problem of their own, whatever their tenant.
import { causeOf, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'one-day-move' | 'unplaced';

// Where each problem is tracked now: one GitHub issue each.
export const ISSUES = 'https://github.com/nwinger/mega-dev/issues';
export const ISSUE: Partial<Record<Problem, number>> = { parser: 1, hint: 2, 'one-day-move': 3 };

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'one-day-move';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  issue: number | null;
};

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const byProblem = new Map<Problem, Report[]>();
  for (const r of reports) {
    const p = problemOf(r, tenantOf(r), oneDayMove);
    byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
  }
  return [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        taggedAs: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
        tenants: new Set(rs.map((r) => r.tenant)).size,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
        issue: ISSUE[problem] ?? null,
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}
