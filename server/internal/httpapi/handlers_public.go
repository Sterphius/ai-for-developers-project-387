package httpapi

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"calendar-booking/server/internal/model"
	"calendar-booking/server/internal/store"
)

// emailRE is a deliberately simple sanity check, matching the frontend rule.
func validEmail(s string) bool {
	at := strings.IndexByte(s, '@')
	if at <= 0 || at == len(s)-1 {
		return false
	}
	dot := strings.IndexByte(s[at:], '.')
	return dot > 0 && at+dot < len(s)-1
}

// GET /api/event-types
func (s *Server) listEventTypes(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.ListEventTypes())
}

// GET /api/event-types/{id}
func (s *Server) getEventType(w http.ResponseWriter, r *http.Request) {
	et, err := s.store.GetEventType(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, model.ErrEventTypeNotFound, "тип события не найден")
		return
	}
	writeJSON(w, http.StatusOK, et)
}

// GET /api/event-types/{id}/slots?from&to
func (s *Server) getSlots(w http.ResponseWriter, r *http.Request) {
	from, err := parseTimeQuery(r, "from")
	if err != nil {
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "невалидный параметр from (ожидается RFC3339)")
		return
	}
	to, err := parseTimeQuery(r, "to")
	if err != nil {
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "невалидный параметр to (ожидается RFC3339)")
		return
	}

	out, err := s.store.Slots(r.PathValue("id"), from, to)
	if errors.Is(err, store.ErrEventTypeNotFound) {
		writeError(w, http.StatusNotFound, model.ErrEventTypeNotFound, "тип события не найден")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, err.Error())
		return
	}
	if out == nil {
		out = []model.Slot{}
	}
	writeJSON(w, http.StatusOK, out)
}

// POST /api/bookings
func (s *Server) createBooking(w http.ResponseWriter, r *http.Request) {
	var in model.BookingCreate
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "невалидное тело запроса")
		return
	}
	if strings.TrimSpace(in.EventTypeID) == "" {
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "не указан eventTypeId")
		return
	}
	if strings.TrimSpace(in.GuestName) == "" {
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "не указано имя гостя")
		return
	}
	if !validEmail(in.GuestEmail) {
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "невалидный email")
		return
	}
	if in.Start.IsZero() {
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "не указано время start")
		return
	}

	booking, err := s.store.CreateBooking(in)
	switch {
	case err == nil:
		writeJSON(w, http.StatusCreated, booking)
	case errors.Is(err, store.ErrEventTypeNotFound):
		writeError(w, http.StatusNotFound, model.ErrEventTypeNotFound, "тип события не найден")
	case errors.Is(err, store.ErrOutOfWindow):
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "слот вне 14-дневного окна")
	case errors.Is(err, store.ErrNotAligned):
		writeError(w, http.StatusBadRequest, model.ErrInvalidSlot, "слот не выровнен по сетке длительности")
	case errors.Is(err, store.ErrSlotTaken):
		writeError(w, http.StatusConflict, model.ErrSlotTaken, "слот уже занят")
	default:
		writeError(w, http.StatusInternalServerError, model.ErrorCode("INTERNAL"), "внутренняя ошибка")
	}
}

// parseTimeQuery reads an optional RFC3339 query param.
func parseTimeQuery(r *http.Request, name string) (*time.Time, error) {
	raw := r.URL.Query().Get(name)
	if raw == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return nil, err
	}
	u := t.UTC()
	return &u, nil
}
