/**
 * Election Campaign OS — My Tasks
 * IC-ECOS-BUILD-2026-V2 §4.1. The screen `src/dal/ports/tasks.ts` had been
 * waiting on — see taskStatus.ts for why there is no capability gate here
 * beyond scope.
 *
 * Reference: the Stitch suite's `volunteer_tasks_innovation_consult_
 * edition` screen (docs/stitch-screens/). Its "Daily Quota 14/20 Voters"
 * progress bar and route-optimised map snippet are not built here — `Task`
 * carries no quota or route field, and nothing in this codebase tracks
 * either. Real task status and due dates, honestly short of the full
 * mockup, beats inventing two numbers this product cannot back up.
 *
 * Reached from War Room's quick links rather than the primary nav, same
 * reasoning as VotersPage's "Work a round" link: §3.2 fixes the nav at
 * nine items and `nav.test.ts` holds the build to them.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dal } from '@/dal';
import { useSession } from '@/auth/useSession';
import type { Task } from '@/dal/ports/tasks';
import { TONE_PILL_CLASSES } from '@/design/toneClasses';
import { actionLabel, nextStatus, sortTasks, TASK_STATUS_LABEL } from './taskStatus';

type FilterTab = 'OPEN_WORK' | Task['status'];

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'OPEN_WORK', label: 'To do' },
  { key: 'OPEN', label: TASK_STATUS_LABEL.OPEN },
  { key: 'IN_PROGRESS', label: TASK_STATUS_LABEL.IN_PROGRESS },
  { key: 'DONE', label: TASK_STATUS_LABEL.DONE },
];

const STATUS_TONE: Record<Task['status'], keyof typeof TONE_PILL_CLASSES> = {
  OPEN: 'gold',
  IN_PROGRESS: 'teal',
  DONE: 'green',
};

export function TasksPage() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FilterTab>('OPEN_WORK');

  const tasksQuery = useQuery({
    queryKey: ['tasks-assigned-to', session?.tenantId, session?.uid],
    queryFn: () => dal.tasks.listAssignedTo(session!, session!.uid),
    enabled: Boolean(session),
  });

  const advance = useMutation({
    mutationFn: async (task: Task) => {
      const to = nextStatus(task.status);
      if (!to) return;
      await dal.tasks.upsert(session!, {
        id: task.id,
        tenantId: task.tenantId,
        wardCode: task.wardCode,
        vdCode: task.vdCode,
        assignedTo: task.assignedTo,
        title: task.title,
        status: to,
        dueAt: task.dueAt,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks-assigned-to'] }),
  });

  if (!session) {
    return (
      <div className="rounded-lg border border-slate/30 bg-white p-6 max-w-lg">
        <p className="text-label-caps font-display uppercase text-slate">/tasks</p>
        <h1 className="text-headline-md font-display text-ink mt-1">My Tasks</h1>
        <p className="mt-3 text-body-md font-body text-slate">
          No active session — see BUILD-STATUS.md (no live Firebase project provisioned yet).
        </p>
      </div>
    );
  }

  const allTasks = sortTasks(tasksQuery.data ?? []);
  const visible = allTasks.filter((t) => (tab === 'OPEN_WORK' ? t.status !== 'DONE' : t.status === tab));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-label-caps font-display uppercase text-slate">/tasks</p>
        <h1 className="text-headline-md font-display text-ink mt-1">My Tasks</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded border text-label-caps font-display uppercase transition-colors ${
              tab === key ? 'bg-ink text-paper border-ink' : 'bg-white border-ink/20 text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tasksQuery.isLoading && <p className="text-body-md font-body text-slate">Loading…</p>}

      {!tasksQuery.isLoading && visible.length === 0 && (
        <p className="text-body-md font-body text-slate border-l-4 border-gold bg-paper p-3">
          Nothing here. {tab === 'OPEN_WORK' ? 'No open or in-progress tasks assigned to you.' : 'No tasks in this state.'}
        </p>
      )}

      <div className="space-y-3">
        {visible.map((t) => (
          <div key={t.id} className="bg-white border border-ink/10 rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-headline-md font-display text-ink">{t.title}</h3>
                {(t.wardCode || t.vdCode) && (
                  <p className="text-body-md font-body text-slate mt-0.5">
                    {[t.wardCode, t.vdCode].filter(Boolean).join(' · ')}
                  </p>
                )}
                {t.dueAt && (
                  <p className="text-data-mono font-mono text-slate mt-0.5">
                    Due {new Date(t.dueAt).toLocaleDateString('en-ZA')}
                  </p>
                )}
              </div>
              <span
                className={`px-3 py-1.5 rounded border text-label-caps font-display uppercase whitespace-nowrap ${TONE_PILL_CLASSES[STATUS_TONE[t.status]]}`}
              >
                {TASK_STATUS_LABEL[t.status]}
              </span>
            </div>
            {actionLabel(t.status) && (
              <button
                type="button"
                onClick={() => advance.mutate(t)}
                disabled={advance.isPending}
                className="w-full bg-gold text-ink py-2.5 px-4 rounded text-label-caps font-display uppercase disabled:opacity-50"
              >
                {actionLabel(t.status)}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
