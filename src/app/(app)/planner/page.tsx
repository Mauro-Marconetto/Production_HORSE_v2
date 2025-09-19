import PlannerClient from './planner-client';
import { machines, molds, pieces, planAssignments, calendarEvents } from '@/lib/data';

export default function PlannerPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <PlannerClient
        initialAssignments={planAssignments}
        machines={machines}
        molds={molds}
        pieces={pieces}
        calendarEvents={calendarEvents}
      />
    </main>
  );
}
