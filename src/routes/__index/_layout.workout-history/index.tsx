import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { deleteWorkoutsServerFn } from "@/lib/workouts.server";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { workoutHistoryQueryOptions } from "./-queries/workout-history";
import { movementProgressionQueryOptions } from "./-queries/movement-progression";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ProgressionChart } from "@/components/progression-chart";
import { useVirtualizer } from "@tanstack/react-virtual";

export const Route = createFileRoute("/__index/_layout/workout-history/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(workoutHistoryQueryOptions());
  },
  component: WorkoutHistoryPage,
});

type Metric = "maxWeight" | "totalReps" | "totalVolume";

const COL = "grid-cols-[2rem_1fr_5rem_8rem_2.5rem]";

function WorkoutHistoryPage() {
  const queryClient = useQueryClient();
  const { data: workouts } = useSuspenseQuery(workoutHistoryQueryOptions());

  const [selectedWorkouts, setSelectedWorkouts] = useState<Set<string>>(new Set());
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(
    () => new Set(workouts.length > 0 ? [workouts[0].id] : []),
  );
  const [selectedMovementId, setSelectedMovementId] = useState<string>("");
  const [selectedMetric, setSelectedMetric] = useState<Metric>("maxWeight");

  const listRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: workouts.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 52,
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 5,
  });

  const deleteWorkoutsMutation = useMutation({
    mutationFn: (workoutIds: string[]) => deleteWorkoutsServerFn({ data: { workoutIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutHistoryQueryOptions().queryKey });
      setSelectedWorkouts(new Set());
    },
  });

  const progressionQuery = useQuery({
    ...movementProgressionQueryOptions({ movementId: selectedMovementId }),
    enabled: !!selectedMovementId,
  });

  const uniqueMovements = Array.from(
    new Map(workouts.flatMap((w) => w.sets.map((s) => [s.movement.id, s.movement.name]))).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const allSelected = workouts.length > 0 && selectedWorkouts.size === workouts.length;

  const toggleWorkout = (id: string) => {
    setSelectedWorkouts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedWorkouts(allSelected ? new Set() : new Set(workouts.map((w) => w.id)));
  };

  const toggleExpand = (id: string) => {
    setExpandedWorkouts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const metricLabels: Record<Metric, string> = {
    maxWeight: "Max Weight",
    totalReps: "Total Reps",
    totalVolume: "Total Volume",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Workout History</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Completed Workouts</CardTitle>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteWorkoutsMutation.mutate(Array.from(selectedWorkouts))}
            disabled={selectedWorkouts.size === 0}>
            <Trash2 className="w-4 h-4 mr-2" />
            {deleteWorkoutsMutation.isPending ? "Deleting..." : `Delete Selected (${selectedWorkouts.size})`}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {workouts.length === 0 ? (
            <p className="text-sm text-slate-500 px-6 py-4">No completed workouts yet.</p>
          ) : (
            <>
              {/* Sticky column header — outside the scroll container */}
              <div className={`grid ${COL} items-center border-b border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide`}>
                <div>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </div>
                <div>Date</div>
                <div className="text-right">Sets</div>
                <div className="text-right">Volume (lbs)</div>
                <div />
              </div>

              {/* Virtualized scrollable list */}
              <div ref={listRef} className="overflow-y-auto max-h-[520px]">
                <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const workout = workouts[virtualRow.index];
                    const isExpanded = expandedWorkouts.has(workout.id);
                    const isSelected = selectedWorkouts.has(workout.id);
                    const totalVolume = workout.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

                    return (
                      <div
                        key={workout.id}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${virtualRow.start}px)` }}
                        className={`border-b border-slate-100 last:border-0 ${isSelected ? "bg-primary/5" : ""}`}>
                        {/* Summary row */}
                        <div className={`grid ${COL} items-center px-4 py-3`}>
                          <div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleWorkout(workout.id)}
                              className="rounded border-gray-300"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <button
                            className="text-left text-sm text-slate-700 font-medium hover:text-slate-900"
                            onClick={() => toggleExpand(workout.id)}>
                            {workout.completedAt
                              ? new Date(workout.completedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </button>
                          <div className="text-right text-sm text-slate-600">{workout.sets.length}</div>
                          <div className="text-right text-sm text-slate-600">
                            {totalVolume.toLocaleString()}
                          </div>
                          <button
                            onClick={() => toggleExpand(workout.id)}
                            className="flex items-center justify-center text-slate-400 hover:text-slate-600">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Expanded sets subtree */}
                        {isExpanded && workout.sets.length > 0 && (
                          <div className="mx-4 mb-3 rounded-md border border-slate-200 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="text-left px-3 py-2 font-medium text-slate-500">Movement</th>
                                  <th className="text-right px-3 py-2 font-medium text-slate-500">Weight (lbs)</th>
                                  <th className="text-right px-3 py-2 font-medium text-slate-500">Reps</th>
                                  <th className="text-right px-3 py-2 font-medium text-slate-500">Volume (lbs)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {workout.sets.map((set, idx) => (
                                  <tr
                                    key={set.id}
                                    className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                    <td className="px-3 py-1.5 text-slate-700">{set.movement.name}</td>
                                    <td className="px-3 py-1.5 text-right text-slate-600">{set.weight}</td>
                                    <td className="px-3 py-1.5 text-right text-slate-600">{set.reps}</td>
                                    <td className="px-3 py-1.5 text-right text-slate-600">{(set.weight * set.reps).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {isExpanded && workout.sets.length === 0 && (
                          <p className="px-4 pb-3 text-xs text-slate-400">No sets recorded.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Progression</CardTitle>
        </CardHeader>
        <CardContent>
          {uniqueMovements.length === 0 ? (
            <p className="text-sm text-slate-500">Complete a workout to start tracking your progression.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select
                  value={selectedMovementId}
                  onChange={(e) => setSelectedMovementId(e.target.value)}
                  className="sm:max-w-xs">
                  <option value="">Select a movement...</option>
                  {uniqueMovements.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </Select>
                <div className="flex gap-2">
                  {(["maxWeight", "totalReps", "totalVolume"] as const).map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant={selectedMetric === m ? "default" : "outline"}
                      onClick={() => setSelectedMetric(m)}>
                      {metricLabels[m]}
                    </Button>
                  ))}
                </div>
              </div>
              {selectedMovementId === "" ? (
                <p className="text-sm text-slate-500">Select a movement above to see your progression chart.</p>
              ) : progressionQuery.data && progressionQuery.data.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No progression data for this movement yet. Add it to a workout to get started.
                </p>
              ) : progressionQuery.data ? (
                <ProgressionChart data={progressionQuery.data} metric={selectedMetric} />
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
