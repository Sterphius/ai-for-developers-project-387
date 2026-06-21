import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import {
  ApiClientError,
  useCreateBooking,
  usePublicEventType,
  useSlots,
} from "@/api/hooks";
import type { Slot } from "@/api/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorBanner } from "@/components/ErrorBanner";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toaster";
import { getErrorMessage } from "@/lib/errors";
import {
  formatDuration,
  formatTimeRange,
  groupByDay,
  localTimeZone,
} from "@/lib/datetime";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BookingPage() {
  const { eventTypeId = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const eventTypeQuery = usePublicEventType(eventTypeId);

  const [customDurationMinutes, setCustomDurationMinutes] = useState<
    number | undefined
  >(undefined);
  const [durationInput, setDurationInput] = useState("");

  const eventType = eventTypeQuery.data;

  // Устанавливаем длительность по умолчанию из типа события.
  useEffect(() => {
    if (eventType) {
      setCustomDurationMinutes(eventType.durationMinutes);
      setDurationInput(String(eventType.durationMinutes));
    }
  }, [eventType]);

  const slotsQuery = useSlots(eventTypeId, customDurationMinutes);
  const createBooking = useCreateBooking();

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function commitDuration() {
    const val = parseInt(durationInput, 10);
    if (Number.isInteger(val) && val >= 1) {
      setCustomDurationMinutes(val);
    } else if (eventType) {
      setDurationInput(String(eventType.durationMinutes));
      setCustomDurationMinutes(eventType.durationMinutes);
    }
  }

  // Тип события не найден → возвращаем на список.
  useEffect(() => {
    if (
      eventTypeQuery.error instanceof ApiClientError &&
      eventTypeQuery.error.status === 404
    ) {
      toast("Тип события не найден.", "error");
      navigate("/", { replace: true });
    }
  }, [eventTypeQuery.error, navigate, toast]);

  const dayGroups = useMemo(
    () => groupByDay(slotsQuery.data ?? [], (s) => s.start),
    [slotsQuery.data],
  );

  const hasAnyAvailable = useMemo(
    () => (slotsQuery.data ?? []).some((s) => s.available),
    [slotsQuery.data],
  );

  function openForm(slot: Slot) {
    setSelectedSlot(slot);
    setFormError(null);
  }

  function closeForm() {
    setSelectedSlot(null);
    createBooking.reset();
  }

  async function submit() {
    if (!selectedSlot) return;
    setFormError(null);

    if (!guestName.trim()) {
      setFormError("Укажите имя.");
      return;
    }
    if (!EMAIL_RE.test(guestEmail)) {
      setFormError("Укажите корректный email.");
      return;
    }

    try {
      const booking = await createBooking.mutateAsync({
        eventTypeId,
        start: selectedSlot.start,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        durationMinutes: customDurationMinutes,
      });
      navigate(`/book/${encodeURIComponent(eventTypeId)}/success`, {
        state: { booking, eventType: eventTypeQuery.data },
      });
    } catch (err) {
      if (err instanceof ApiClientError) {
        // Обработка по кодам контракта.
        if (err.code === "SLOT_TAKEN") {
          toast(getErrorMessage(err), "error");
          closeForm();
          slotsQuery.refetch();
          return;
        }
        if (err.code === "INVALID_SLOT") {
          setFormError(getErrorMessage(err));
          slotsQuery.refetch();
          return;
        }
        if (err.code === "EVENT_TYPE_NOT_FOUND") {
          toast(getErrorMessage(err), "error");
          navigate("/", { replace: true });
          return;
        }
      }
      setFormError(getErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          К списку встреч
        </Link>
      </Button>

      {eventTypeQuery.isLoading && <Spinner />}

      {eventType && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-xl">{eventType.title}</CardTitle>
              <Badge variant="secondary" className="shrink-0 gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(eventType.durationMinutes)}
              </Badge>
            </div>
            {eventType.description && (
              <CardDescription>{eventType.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Время указано в вашей зоне: {localTimeZone}
            </p>
          </CardContent>
        </Card>
      )}

      {eventType && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label htmlFor="duration">Длительность (минут)</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    value={durationInput}
                    onChange={(e) => setDurationInput(e.target.value)}
                    onBlur={commitDuration}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitDuration();
                    }}
                    className="w-24"
                  />
                  {customDurationMinutes !== undefined && (
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(customDurationMinutes)}
                    </span>
                  )}
                </div>
              </div>
              {customDurationMinutes !==
                eventType?.durationMinutes && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (eventType) {
                      setDurationInput(String(eventType.durationMinutes));
                      setCustomDurationMinutes(eventType.durationMinutes);
                    }
                  }}
                >
                  Сбросить
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-3 text-lg font-semibold">Свободные слоты (14 дней)</h2>

      {slotsQuery.error && (
        <ErrorBanner error={slotsQuery.error} className="mb-4" />
      )}
      {slotsQuery.isLoading && <Spinner />}

      {!slotsQuery.isLoading && !hasAnyAvailable && (
        <EmptyState
          title="Нет свободных слотов"
          description="В ближайшие 14 дней свободного времени нет."
        />
      )}

      <div className="space-y-6">
        {dayGroups.map((group) => {
          if (!group.items.some((s) => s.available)) return null;
          return (
            <div key={group.key}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                {group.heading}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.items.map((slot) => (
                  <Button
                    key={slot.start}
                    variant={slot.available ? "outline" : "ghost"}
                    size="sm"
                    disabled={!slot.available}
                    onClick={() => openForm(slot)}
                    className={
                      !slot.available
                        ? "opacity-40 line-through"
                        : undefined
                    }
                  >
                    {formatTimeRange(slot.start, slot.end)}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={selectedSlot !== null}
        onOpenChange={(open) => !open && closeForm()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение брони</DialogTitle>
            <DialogDescription>
              {eventType?.title}
              {selectedSlot &&
                ` · ${formatTimeRange(selectedSlot.start, selectedSlot.end)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="guestName">Имя</Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Иван Иванов"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guestEmail">Email</Label>
              <Input
                id="guestEmail"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="ivan@example.com"
              />
            </div>
            {formError && <ErrorBanner error={new Error(formError)} />}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeForm}
              disabled={createBooking.isPending}
            >
              Отмена
            </Button>
            <Button onClick={submit} disabled={createBooking.isPending}>
              {createBooking.isPending ? "Бронирование…" : "Забронировать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
