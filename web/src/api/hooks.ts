import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  api,
  type ApiError,
  type Booking,
  type BookingCreate,
  type EventType,
  type EventTypeCreate,
  type EventTypeUpdate,
  type Owner,
  type Slot,
} from "./client";

/**
 * Ошибка API в формате контракта (Error{code,message}).
 * Бросается из хуков, чтобы react-query обрабатывал её единообразно.
 */
export class ApiClientError extends Error {
  code: ApiError["code"] | "UNKNOWN";
  status: number;

  constructor(status: number, payload?: ApiError) {
    super(payload?.message ?? "Неизвестная ошибка");
    this.name = "ApiClientError";
    this.status = status;
    this.code = payload?.code ?? "UNKNOWN";
  }
}

export const queryKeys = {
  publicEventTypes: ["public", "event-types"] as const,
  publicEventType: (id: string) => ["public", "event-types", id] as const,
  slots: (id: string) => ["public", "event-types", id, "slots"] as const,
  adminEventTypes: ["admin", "event-types"] as const,
  adminBookings: ["admin", "bookings"] as const,
  owner: ["admin", "owner"] as const,
};

// --------------------------------------------------------------------------
// Публичные (гость)
// --------------------------------------------------------------------------

export function usePublicEventTypes() {
  return useQuery({
    queryKey: queryKeys.publicEventTypes,
    queryFn: async (): Promise<EventType[]> => {
      const { data, response } = await api.GET("/api/event-types");
      if (!response.ok) throw new ApiClientError(response.status);
      return data ?? [];
    },
  });
}

export function usePublicEventType(id: string) {
  return useQuery({
    queryKey: queryKeys.publicEventType(id),
    enabled: Boolean(id),
    queryFn: async (): Promise<EventType> => {
      const { data, error, response } = await api.GET(
        "/api/event-types/{id}",
        { params: { path: { id } } },
      );
      if (error) throw new ApiClientError(response.status, error);
      return data!;
    },
  });
}

export function useSlots(id: string, durationMinutes?: number) {
  return useQuery({
    queryKey: [...queryKeys.slots(id), { durationMinutes }],
    enabled: Boolean(id),
    queryFn: async (): Promise<Slot[]> => {
      const params: { path: { id: string }; query?: { durationMinutes?: number } } = {
        path: { id },
      };
      if (durationMinutes !== undefined) {
        params.query = { durationMinutes };
      }
      const { data, error, response } = await api.GET(
        "/api/event-types/{id}/slots",
        { params },
      );
      if (error) throw new ApiClientError(response.status, error);
      return data ?? [];
    },
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: async (body: BookingCreate): Promise<Booking> => {
      const { data, error, response } = await api.POST("/api/bookings", {
        body,
      });
      if (error) throw new ApiClientError(response.status, error);
      return data!;
    },
  });
}

// --------------------------------------------------------------------------
// Админ (владелец)
// --------------------------------------------------------------------------

export function useAdminEventTypes() {
  return useQuery({
    queryKey: queryKeys.adminEventTypes,
    queryFn: async (): Promise<EventType[]> => {
      const { data, response } = await api.GET("/api/admin/event-types");
      if (!response.ok) throw new ApiClientError(response.status);
      return data ?? [];
    },
  });
}

export function useCreateEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: EventTypeCreate): Promise<EventType> => {
      const { data, error, response } = await api.POST(
        "/api/admin/event-types",
        { body },
      );
      if (error) throw new ApiClientError(response.status, error);
      return data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminEventTypes });
      qc.invalidateQueries({ queryKey: queryKeys.publicEventTypes });
    },
  });
}

export function useUpdateEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: string;
      body: EventTypeUpdate;
    }): Promise<EventType> => {
      const { data, error, response } = await api.PATCH(
        "/api/admin/event-types/{id}",
        { params: { path: { id: vars.id } }, body: vars.body },
      );
      if (error) throw new ApiClientError(response.status, error);
      return data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminEventTypes });
      qc.invalidateQueries({ queryKey: queryKeys.publicEventTypes });
    },
  });
}

export function useDeleteEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error, response } = await api.DELETE(
        "/api/admin/event-types/{id}",
        { params: { path: { id } } },
      );
      if (error) throw new ApiClientError(response.status, error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminEventTypes });
      qc.invalidateQueries({ queryKey: queryKeys.publicEventTypes });
    },
  });
}

export function useAdminBookings() {
  return useQuery({
    queryKey: queryKeys.adminBookings,
    queryFn: async (): Promise<Booking[]> => {
      const { data, response } = await api.GET("/api/admin/bookings");
      if (!response.ok) throw new ApiClientError(response.status);
      // Страхуемся: сортировка по start (API уже сортирует).
      return (data ?? [])
        .slice()
        .sort((a, b) => a.start.localeCompare(b.start));
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error, response } = await api.DELETE(
        "/api/admin/bookings/{id}",
        { params: { path: { id } } },
      );
      if (error) throw new ApiClientError(response.status, error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminBookings });
    },
  });
}

export function useOwner() {
  return useQuery({
    queryKey: queryKeys.owner,
    queryFn: async (): Promise<Owner> => {
      const { data, response } = await api.GET("/api/admin/owner");
      if (!response.ok) throw new ApiClientError(response.status);
      return data!;
    },
  });
}
