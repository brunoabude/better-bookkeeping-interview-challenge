import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { createMovementServerFn, updateMovementServerFn } from "@/lib/movements.server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { movementsQueryOptions } from "./-queries/movements";

export const Route = createFileRoute("/__index/_layout/movements/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(movementsQueryOptions());
  },
  component: MovementsPage,
});

function MovementsPage() {
  const queryClient = useQueryClient();
  const { data: movements } = useSuspenseQuery(movementsQueryOptions());
  const [name, setName] = useState("");
  const [isBodyWeight, setIsBodyWeight] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIsBodyWeight, setEditIsBodyWeight] = useState(false);

  const createMovementMutation = useMutation({
    mutationFn: (data: { name: string; isBodyWeight: boolean }) =>
      createMovementServerFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: movementsQueryOptions().queryKey });
      setName("");
      setIsBodyWeight(false);
    },
  });

  const updateMovementMutation = useMutation({
    mutationFn: (data: { id: string; isBodyWeight: boolean }) =>
      updateMovementServerFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: movementsQueryOptions().queryKey });
      setEditingId(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMovementMutation.mutate({ name: name.trim(), isBodyWeight });
  };

  const handleEditStart = (id: string, currentIsBodyWeight: boolean) => {
    setEditingId(id);
    setEditIsBodyWeight(currentIsBodyWeight);
  };

  const handleEditSave = (id: string) => {
    updateMovementMutation.mutate({ id, isBodyWeight: editIsBodyWeight });
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Movements</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add New Movement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="Movement name (e.g. Bench Press)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!name.trim()}>
                {createMovementMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="isBodyWeight"
                checked={isBodyWeight}
                onCheckedChange={setIsBodyWeight}
              />
              <label htmlFor="isBodyWeight" className="text-sm text-slate-700 cursor-pointer select-none">
                Body-weight movement
              </label>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Movements</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-slate-500">No movements yet. Add one above!</p>
          ) : (
            <ul className="space-y-2">
              {movements.map((movement) => (
                <li key={movement.id} className="px-3 py-2 bg-slate-50 rounded-lg text-sm">
                  {editingId === movement.id ? (
                    <div className="space-y-3">
                      <p className="font-medium text-slate-700">{movement.name}</p>
                      <div className="flex items-center gap-3">
                        <Switch
                          id={`edit-${movement.id}`}
                          checked={editIsBodyWeight}
                          onCheckedChange={setEditIsBodyWeight}
                        />
                        <label htmlFor={`edit-${movement.id}`} className="text-sm text-slate-700 cursor-pointer select-none">
                          Body-weight movement
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditSave(movement.id)}
                          disabled={updateMovementMutation.isPending}
                        >
                          {updateMovementMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleEditCancel}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium text-slate-700">
                        <span>{movement.name}</span>
                        {movement.isBodyWeight && (
                          <Badge>Body Weight</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditStart(movement.id, movement.isBodyWeight)}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
