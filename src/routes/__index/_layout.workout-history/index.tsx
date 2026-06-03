import { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { deleteWorkoutsServerFn } from "@/lib/workouts.server";
import { Trash2, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { workoutHistoryQueryOptions } from "./-queries/workout-history";
import { movementProgressionQueryOptions } from "./-queries/movement-progression";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ProgressionChart } from "@/components/progression-chart";
import { useDebounce } from "@/hooks/use-debounce";
import { Pagination } from "@/components/ui/pagination";

const today = () => new Date().toLocaleDateString("en-CA");
const defaultStartDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 89);
  return d.toLocaleDateString("en-CA");
};

const MAX_RANGE_DAYS = 90;

function validateRange(start: string, end: string): string | null {
  if (start > end) return "Start date must not be after end date";
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
  if (diff > MAX_RANGE_DAYS) return "Date range must not exceed 90 days";
  return null;
}

export const Route = createFileRoute("/__index/_layout/workout-history/")({
  validateSearch: (raw) => ({
    page: Math.max(1, Number(raw.page) || 1),
    from: typeof raw.from === "string" && raw.from ? raw.from : defaultStartDate(),
    to: typeof raw.to === "string" && raw.to ? raw.to : today(),
  }),
  loaderDeps: ({ search: { page, from, to } }) => ({ page, from, to }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      workoutHistoryQueryOptions({ startDate: deps.from, endDate: deps.to, page: deps.page }),
    );
  },
  component: WorkoutHistoryPage,
});

type Metric = "maxWeight" | "totalReps" | "totalVolume";

const COL = "grid-cols-[2rem_1fr_5rem_8rem_2.5rem]";

function WorkoutHistoryPage() {
  const { page, from, to } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [localStart, setLocalStart] = useState(from);
  const [localEnd, setLocalEnd] = useState(to);
  const debouncedStart = useDebounce(localStart, 500);
  const debouncedEnd = useDebounce(localEnd, 500);

  const rangeError = validateRange(localStart, localEnd);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isValid = validateRange(debouncedStart, debouncedEnd) === null;
    if (isValid && (debouncedStart !== from || debouncedEnd !== to)) {
      navigate({
        search: { page: 1, from: debouncedStart, to: debouncedEnd },
        replace: true,
      });
    }
  }, [debouncedStart, debouncedEnd, from, to]);

  useEffect(() => {
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(workoutHistoryQueryOptions({ startDate: from, endDate: to, page }));

  const [selectedWorkouts, setSelectedWorkouts] = useState<Set<string>>(new Set());
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(
    () => new Set(data.items.length > 0 ? [data.items[0].id] : []),
  );
  const [selectedMovementId, setSelectedMovementId] = useState<string>("");
  const [selectedMetric, setSelectedMetric] = useState<Metric>("maxWeight");

  const deleteWorkoutsMutation = useMutation({
    mutationFn: (workoutIds: string[]) => deleteWorkoutsServerFn({ data: { workoutIds } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-history"] });
      setSelectedWorkouts(new Set());
    },
  });

  const progressionQuery = useQuery({
    ...movementProgressionQueryOptions({ movementId: selectedMovementId }),
    enabled: !!selectedMovementId,
  });

  const uniqueMovements = Array.from(
    new Map(data.items.flatMap((w) => w.sets.map((s) => [s.movement.id, s.movement.name]))).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const allSelected = data.items.length > 0 && selectedWorkouts.size === data.items.length;

  const toggleWorkout = (id: string) => {
    setSelectedWorkouts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedWorkouts(allSelected ? new Set() : new Set(data.items.map((w) => w.id)));
  };

  const toggleExpand = (id: string) => {
    setExpandedWorkouts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleReset = () => {
    const newStart = defaultStartDate();
    const newEnd = today();
    setLocalStart(newStart);
    setLocalEnd(newEnd);
    navigate({ search: { page: 1, from: newStart, to: newEnd }, replace: true });
  };

  const metricLabels: Record<Metric, string> = {
    maxWeight: "Max Weight",
    totalReps: "Total Reps",
    totalVolume: "Total Volume",
  };

  const showingFrom = data.items.length === 0 ? 0 : (page - 1) * data.pageSize + 1;
  const showingTo = (page - 1) * data.pageSize + data.items.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Workout History</h1>
      </div>

      {/* Date range picker */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={localStart}
          onChange={(e) => setLocalStart(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="text-sm text-slate-500">to</span>
        <input
          type="date"
          value={localEnd}
          onChange={(e) => setLocalEnd(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button size="sm" variant="outline" onClick={handleReset}>Reset</Button>
        {rangeError && (
          <span title={rangeError} data-testid="range-error-icon">
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </span>
        )}
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
          {data.items.length === 0 ? (
            <p className="text-sm text-slate-500 px-6 py-4">No completed workouts in this date range.</p>
          ) : (
            <>
              {/* Sticky column header */}
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

              {/* Plain list */}
              <div ref={listRef}>
                {data.items.map((workout, idx) => {
                  const isExpanded = expandedWorkouts.has(workout.id);
                  const isSelected = selectedWorkouts.has(workout.id);
                  const totalVolume = workout.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

                  return (
                    <div
                      key={workout.id}
                      data-index={idx}
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
                              {workout.sets.map((set, setIdx) => (
                                <tr
                                  key={set.id}
                                  className={setIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
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

              {/* Pagination controls */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <span className="text-sm text-slate-500">
                  Showing {showingFrom}–{showingTo} of {data.totalCount} workouts
                </span>
                <Pagination
                  page={page}
                  totalPages={data.totalPages}
                  onPageChange={(p) => navigate({ search: (prev) => ({ ...prev, page: p }) })}
                />
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
