import { useMemo, useState } from "react";
import {
  CalendarDays,
  ListChecks,
  LayoutGrid,
  Trash2,
  User,
  Mail,
} from "lucide-react";
import type { Booking } from "@/api/client";
import {
  useAdminBookings,
  useAdminEventTypes,
  useDeleteBooking,
} from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@/components/Spinner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toaster";
import { getErrorMessage } from "@/lib/errors";
import {
  formatTimeRange,
  groupByDay,
  localTimeZone,
} from "@/lib/datetime";

export function BookingsPage() {
  const { toast } = useToast();
  const { data, isLoading, error } = useAdminBookings();
  const eventTypesQuery = useAdminEventTypes();
  const deleteMut = useDeleteBooking();

  const [deleting, setDeleting] = useState<Booking | null>(null);

  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const et of eventTypesQuery.data ?? []) map.set(et.id, et.title);
    return map;
  }, [eventTypesQuery.data]);

  const dayGroups = useMemo(
    () => groupByDay(data ?? [], (b) => b.start),
    [data],
  );

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      toast("Бронирование отменено.", "success");
      setDeleting(null);
    } catch (err) {
      toast(getErrorMessage(err), "error");
    }
  }

  const stats = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);
    const total = data.length;
    const upcoming = data.filter((b) => new Date(b.start) >= now).length;
    const today = data.filter((b) => {
      const d = new Date(b.start);
      return d >= todayStart && d < todayEnd;
    }).length;
    const types = new Set(data.map((b) => b.eventTypeId)).size;
    return { total, upcoming, today, types };
  }, [data]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Предстоящие встречи</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Все бронирования всех типов, по времени. Зона: {localTimeZone}
        </p>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<ListChecks className="h-4 w-4" />}
            label="Всего"
            value={stats.total}
          />
          <StatCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Предстоит"
            value={stats.upcoming}
          />
          <StatCard
            icon={<User className="h-4 w-4" />}
            label="Сегодня"
            value={stats.today}
          />
          <StatCard
            icon={<LayoutGrid className="h-4 w-4" />}
            label="Типов"
            value={stats.types}
          />
        </div>
      )}

      {error && <ErrorBanner error={error} className="mb-4" />}
      {isLoading && <Spinner />}

      {!isLoading && data && data.length === 0 && (
        <EmptyState
          title="Бронирований нет"
          description="Когда гости запишутся, встречи появятся здесь."
        />
      )}

      <div className="space-y-6">
        {dayGroups.map((group) => (
          <div key={group.key}>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              {group.heading}
            </h2>
            <Card className="divide-y">
              {group.items.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatTimeRange(b.start, b.end)}
                      </span>
                      <Badge variant="secondary">
                        {titleById.get(b.eventTypeId) ?? b.eventTypeId}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {b.guestName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {b.guestEmail}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDeleting(b)}
                    aria-label="Отменить бронирование"
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </Card>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Отменить бронирование?"
        description={
          deleting
            ? `Встреча с ${deleting.guestName} (${formatTimeRange(
                deleting.start,
                deleting.end,
              )}) будет отменена.`
            : undefined
        }
        confirmLabel="Отменить"
        onConfirm={confirmDelete}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
