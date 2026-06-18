package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"calendar-booking/server/internal/model"
	"calendar-booking/server/internal/store"
)

// POST /api/admin/event-types
func (s *Server) createEventType(w http.ResponseWriter, r *http.Request) {
	var in model.EventTypeCreate
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "невалидное тело запроса")
		return
	}
	if strings.TrimSpace(in.ID) == "" {
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "не указан id")
		return
	}
	if strings.TrimSpace(in.Title) == "" {
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "не указано название")
		return
	}
	if in.DurationMinutes < 1 {
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "длительность должна быть ≥ 1")
		return
	}

	et, err := s.store.CreateEventType(in)
	switch {
	case err == nil:
		writeJSON(w, http.StatusCreated, et)
	case errors.Is(err, store.ErrEventTypeExists):
		// Per contract, createEventType has only 400 — id conflict maps to it.
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "тип события с таким id уже существует")
	default:
		writeError(w, http.StatusInternalServerError, model.ErrorCode("INTERNAL"), "внутренняя ошибка")
	}
}

// GET /api/admin/event-types
func (s *Server) adminListEventTypes(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.ListEventTypes())
}

// GET /api/admin/event-types/{id}
func (s *Server) adminGetEventType(w http.ResponseWriter, r *http.Request) {
	et, err := s.store.GetEventType(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, model.ErrEventTypeNotFound, "тип события не найден")
		return
	}
	writeJSON(w, http.StatusOK, et)
}

// PATCH /api/admin/event-types/{id}
func (s *Server) updateEventType(w http.ResponseWriter, r *http.Request) {
	var in model.EventTypeUpdate
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "невалидное тело запроса")
		return
	}
	if in.DurationMinutes != nil && *in.DurationMinutes < 1 {
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "длительность должна быть ≥ 1")
		return
	}

	et, err := s.store.UpdateEventType(r.PathValue("id"), in)
	switch {
	case err == nil:
		writeJSON(w, http.StatusOK, et)
	case errors.Is(err, store.ErrEventTypeNotFound):
		writeError(w, http.StatusNotFound, model.ErrEventTypeNotFound, "тип события не найден")
	default:
		writeError(w, http.StatusInternalServerError, model.ErrorCode("INTERNAL"), "внутренняя ошибка")
	}
}

// DELETE /api/admin/event-types/{id}
func (s *Server) deleteEventType(w http.ResponseWriter, r *http.Request) {
	err := s.store.DeleteEventType(r.PathValue("id"))
	switch {
	case err == nil:
		w.WriteHeader(http.StatusNoContent)
	case errors.Is(err, store.ErrEventTypeNotFound):
		writeError(w, http.StatusNotFound, model.ErrEventTypeNotFound, "тип события не найден")
	default:
		writeError(w, http.StatusInternalServerError, model.ErrorCode("INTERNAL"), "внутренняя ошибка")
	}
}

// GET /api/admin/bookings
func (s *Server) listBookings(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.ListBookings())
}

// DELETE /api/admin/bookings/{id}
func (s *Server) deleteBooking(w http.ResponseWriter, r *http.Request) {
	err := s.store.DeleteBooking(r.PathValue("id"))
	switch {
	case err == nil:
		w.WriteHeader(http.StatusNoContent)
	case errors.Is(err, store.ErrBookingNotFound):
		writeError(w, http.StatusNotFound, model.ErrBookingNotFound, "бронирование не найдено")
	default:
		writeError(w, http.StatusInternalServerError, model.ErrorCode("INTERNAL"), "внутренняя ошибка")
	}
}

// GET /api/admin/owner
func (s *Server) getOwner(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.Owner())
}
