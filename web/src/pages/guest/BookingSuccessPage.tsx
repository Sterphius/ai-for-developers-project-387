import { Link, useLocation, useParams } from "react-router-dom";
import { CheckCircle2, Clock, CalendarDays, User, Mail } from "lucide-react";
import type { Booking, EventType } from "@/api/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatDateTime,
  formatDuration,
  formatTimeRange,
  localTimeZone,
} from "@/lib/datetime";

interface SuccessState {
  booking?: Booking;
  eventType?: EventType;
}

export function BookingSuccessPage() {
  const { eventTypeId = "" } = useParams();
  const location = useLocation();
  const state = (location.state as SuccessState) ?? {};
  const { booking, eventType } = state;

  // Прямой заход без данных брони → возврат к выбору времени.
  if (!booking) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="mb-4 text-muted-foreground">
          Данные бронирования недоступны.
        </p>
        <Button asChild>
          <Link to={`/book/${encodeURIComponent(eventTypeId)}`}>
            Выбрать время
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="mb-2 h-12 w-12 text-green-600" />
          <CardTitle>Встреча забронирована</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {eventType && (
            <Row icon={<CalendarDays className="h-4 w-4" />} label="Тип">
              {eventType.title}
            </Row>
          )}
          <Row icon={<Clock className="h-4 w-4" />} label="Время">
            {formatDateTime(booking.start)} (
            {formatTimeRange(booking.start, booking.end)})
          </Row>
          {eventType && (
            <Row icon={<Clock className="h-4 w-4" />} label="Длительность">
              {formatDuration(eventType.durationMinutes)}
            </Row>
          )}
          <Row icon={<User className="h-4 w-4" />} label="Гость">
            {booking.guestName}
          </Row>
          <Row icon={<Mail className="h-4 w-4" />} label="Email">
            {booking.guestEmail}
          </Row>
          <p className="pt-2 text-center text-xs text-muted-foreground">
            Зона времени: {localTimeZone}
          </p>
          <Button asChild className="w-full">
            <Link to="/">Забронировать ещё</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-2 text-sm last:border-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}
