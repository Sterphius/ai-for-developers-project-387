import { Link } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import { usePublicEventTypes } from "@/api/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@/components/Spinner";
import { formatDuration } from "@/lib/datetime";

export function EventTypesPage() {
  const { data, isLoading, error } = usePublicEventTypes();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Выберите вид встречи</h1>
        <p className="mt-1 text-muted-foreground">
          Доступная запись на ближайшие 14 дней.
        </p>
      </div>

      {error && <ErrorBanner error={error} className="mb-4" />}
      {isLoading && <Spinner />}

      {!isLoading && data && data.length === 0 && (
        <EmptyState
          title="Пока нет доступных типов встреч"
          description="Загляните позже — владелец ещё не создал виды бронирования."
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((et) => (
          <Card key={et.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle>{et.title}</CardTitle>
                <Badge variant="secondary" className="shrink-0 gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(et.durationMinutes)}
                </Badge>
              </div>
              {et.description && (
                <CardDescription>{et.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-1" />
            <CardFooter>
              <Button asChild className="w-full">
                <Link to={`/book/${encodeURIComponent(et.id)}`}>
                  Выбрать время
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
