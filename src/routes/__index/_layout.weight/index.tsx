import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useState, useEffect } from "react";
import { Trash2, AlertCircle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upsertWeightEntryServerFn, deleteWeightEntryServerFn } from "@/lib/weight.server";
import { weightEntriesQueryOptions } from "./-queries/weight";
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

export const Route = createFileRoute("/__index/_layout/weight/")({
  validateSearch: (raw) => ({
    page: Math.max(1, Number(raw.page) || 1),
    from: typeof raw.from === "string" && raw.from ? raw.from : defaultStartDate(),
    to: typeof raw.to === "string" && raw.to ? raw.to : today(),
  }),
  loaderDeps: ({ search: { page, from, to } }) => ({ page, from, to }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      weightEntriesQueryOptions({ startDate: deps.from, endDate: deps.to, page: deps.page }),
    );
  },
  component: WeightPage,
});

function WeightPage() {
  const queryClient = useQueryClient();

  const { page, from, to } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [localStart, setLocalStart] = useState(from);
  const [localEnd, setLocalEnd] = useState(to);
  const debouncedStart = useDebounce(localStart, 500);
  const debouncedEnd = useDebounce(localEnd, 500);

  const rangeError = validateRange(localStart, localEnd);

  useEffect(() => {
    const isValid = validateRange(debouncedStart, debouncedEnd) === null;
    if (isValid && (debouncedStart !== from || debouncedEnd !== to)) {
      navigate({
        search: { page: 1, from: debouncedStart, to: debouncedEnd },
        replace: true,
      });
    }
  }, [debouncedStart, debouncedEnd, from, to]);

  const { data } = useSuspenseQuery(weightEntriesQueryOptions({ startDate: from, endDate: to, page }));

  const upsertMutation = useMutation({
    mutationFn: (weight: number) =>
      upsertWeightEntryServerFn({ data: { weight, date: new Date().toLocaleDateString("en-CA") } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight-entries"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteWeightEntryServerFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weight-entries"] });
    },
  });

  const form = useForm({
    defaultValues: { weight: "" },
    onSubmit: async ({ value, formApi }) => {
      const parsed = parseFloat(value.weight);
      if (isNaN(parsed) || parsed <= 0 || parsed > 320) return;
      await upsertMutation.mutateAsync(parsed);
      formApi.reset();
    },
  });

  const handleReset = () => {
    const newStart = defaultStartDate();
    const newEnd = today();
    setLocalStart(newStart);
    setLocalEnd(newEnd);
    navigate({ search: { page: 1, from: newStart, to: newEnd }, replace: true });
  };

  const showingFrom = data.items.length === 0 ? 0 : (page - 1) * data.pageSize + 1;
  const showingTo = (page - 1) * data.pageSize + data.items.length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Weight Tracking</h1>

      <Card>
        <CardHeader>
          <CardTitle>Log Today's Weight</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="flex gap-2 items-start">
            <form.Field
              name="weight"
              validators={{
                onChange: ({ value }) => {
                  if (value === "") return undefined;
                  const n = parseFloat(value);
                  if (isNaN(n)) return "Must be a number";
                  if (n <= 0) return "Must be greater than 0";
                  if (n > 320) return "Must be 320 or less";
                  return undefined;
                },
              }}>
              {(field) => (
                <div className="flex flex-col gap-1">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Weight (lbs)"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="w-40"
                  />
                  {field.state.meta.errors.length > 0 && (
                    <span className="text-xs text-red-500">{field.state.meta.errors[0]}</span>
                  )}
                </div>
              )}
            </form.Field>
            <Button type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "Saving..." : "Log Weight"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Date range filter — affects both chart and history */}
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

      {data.chartItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weight Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.chartItems}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }
                />
                <YAxis domain={["auto", "auto"]} />
                <Tooltip
                  labelFormatter={(d) =>
                    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  }
                  formatter={(value) => [`${value} lbs`, "Weight"]}
                />
                <Line type="monotone" dataKey="weight" dot={true} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.items.length === 0 ? (
            <p className="text-sm text-slate-500">No weight entries yet. Log your first entry above.</p>
          ) : (
            <>
              <div>
                {data.items.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-0.5 py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-600">
                      {new Date(entry.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-900">{entry.weight} lbs</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(entry.id)}
                        disabled={deleteMutation.isPending}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-500">
                  Showing {showingFrom}–{showingTo} of {data.totalCount} entries
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
    </div>
  );
}
