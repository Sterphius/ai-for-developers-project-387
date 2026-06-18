import { useState } from "react";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import type { EventType } from "@/api/client";
import { useAdminEventTypes, useDeleteEventType } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@/components/Spinner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toaster";
import { getErrorMessage } from "@/lib/errors";
import { formatDuration } from "@/lib/datetime";
import { EventTypeFormDialog } from "./EventTypeFormDialog";

export function EventTypesAdminPage() {
  const { toast } = useToast();
  const { data, isLoading, error } = useAdminEventTypes();
  const deleteMut = useDeleteEventType();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventType | null>(null);
  const [deleting, setDeleting] = useState<EventType | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(et: EventType) {
    setEditing(et);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      toast("Тип события удалён.", "success");
      setDeleting(null);
    } catch (err) {
      toast(getErrorMessage(err), "error");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Типы событий</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Управление видами бронирования.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Создать тип
        </Button>
      </div>

      {error && <ErrorBanner error={error} className="mb-4" />}
      {isLoading && <Spinner />}

      {!isLoading && data && data.length === 0 && (
        <EmptyState
          title="Типов событий пока нет"
          description="Создайте первый тип, чтобы гости могли бронировать встречи."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Создать тип
            </Button>
          }
        />
      )}

      {data && data.length > 0 && (
        <Card className="divide-y">
          {data.map((et) => (
            <div
              key={et.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{et.title}</span>
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(et.durationMinutes)}
                  </Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {et.description || "—"}
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  id: {et.id}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => openEdit(et)}
                  aria-label="Редактировать"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDeleting(et)}
                  aria-label="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <EventTypeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Удалить тип события?"
        description={
          deleting
            ? `«${deleting.title}» будет удалён. Действие необратимо.`
            : undefined
        }
        onConfirm={confirmDelete}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
