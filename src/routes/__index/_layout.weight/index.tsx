import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Trash2 } from "lucide-react";
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

export const Route = createFileRoute("/__index/_layout/weight/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(weightEntriesQueryOptions());
  },
  component: WeightPage,
});

const HISTORY_ITEM_HEIGHT = 41; // py-2 + border + text = ~41px
const HISTORY_MAX_VISIBLE = 8;

function WeightPage() {
  const queryClient = useQueryClient();
  const { data: entries } = useSuspenseQuery(weightEntriesQueryOptions());
  const listRef = useRef<HTMLDivElement>(null);
  const reversedEntries = [...entries].reverse();

  const rowVirtualizer = useVirtualizer({
    count: reversedEntries.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => HISTORY_ITEM_HEIGHT,
    overscan: 5,
  });

  const upsertMutation = useMutation({
    mutationFn: (weight: number) =>
      upsertWeightEntryServerFn({ data: { weight, date: new Date().toLocaleDateString("en-CA") } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightEntriesQueryOptions().queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteWeightEntryServerFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightEntriesQueryOptions().queryKey });
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

      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weight Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={entries}>
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
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-slate-500">No weight entries yet. Log your first entry above.</p>
          ) : (
            <div
              ref={listRef}
              style={{ height: Math.min(reversedEntries.length, HISTORY_MAX_VISIBLE) * HISTORY_ITEM_HEIGHT }}
              className="overflow-y-auto">
              <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const entry = reversedEntries[virtualRow.index];
                  return (
                    <div
                      key={entry.id}
                      style={{ position: "absolute", top: virtualRow.start, left: 0, right: 0, height: virtualRow.size }}
                      className="flex items-center justify-between px-0.5 border-b border-slate-100 last:border-0">
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
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
