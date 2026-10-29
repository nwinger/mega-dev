// The problems inside a merged ticket. Pages explain them; this file is what runs.

// A problem is the report's cause by tenant (causes.ts). The reports the desk read as a one-day move
// (desk-notes.json) are a problem of their own too: a day/month swap cannot move a date by one day.
// The desk counts them where they're filed, under their cause (readAs), so they count in both rows.
import { causeOf, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'one-day-move' | 'unplaced';

// Where each problem is tracked now: one GitHub issue each.
export const ISSUES = 'https://github.com/nwinger/mega-dev/issues';
export const ISSUE: Partial<Record<Problem, number>> = { parser: 1, hint: 2, 'one-day-move': 3 };

export function problemsOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem[] {
  const cause = causeOf(r, t) ?? 'unplaced';
  return oneDayMove.includes(r.id) ? [cause, 'one-day-move'] : [cause];
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
  // Reports in this row that also count in another row.
  alsoIn: { problem: Problem; count: number }[];
};

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const byProblem = new Map<Problem, Report[]>();
  const problems = new Map(reports.map((r) => [r, problemsOf(r, tenantOf(r), oneDayMove)] as const));
  for (const [r, ps] of problems) {
    for (const p of ps) byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
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
        alsoIn: [...rs.flatMap((r) => problems.get(r)!.filter((p) => p !== problem)).reduce(
          (n, p) => n.set(p, (n.get(p) ?? 0) + 1),
          new Map<Problem, number>(),
        )].map(([p, count]) => ({ problem: p, count })),
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}
