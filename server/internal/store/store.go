// Package store is an in-memory, thread-safe data store. All business rules
// (booking conflicts, window, grid alignment) live here so handlers stay thin.
// Data is lost on restart.
package store

import (
	"errors"
	"sort"
	"sync"
	"time"

	"calendar-booking/server/internal/id"
	"calendar-booking/server/internal/model"
	"calendar-booking/server/internal/slots"
)

// Sentinel errors mapped to HTTP responses by the handler layer.
var (
	ErrEventTypeNotFound = errors.New("event type not found")
	ErrEventTypeExists   = errors.New("event type id already exists")
	ErrBookingNotFound   = errors.New("booking not found")
	ErrOutOfWindow       = errors.New("slot is outside the 14-day window")
	ErrNotAligned        = errors.New("slot is not aligned to the duration grid")
	ErrSlotTaken         = errors.New("slot is already taken")
)

// Store holds all state in memory.
type Store struct {
	mu         sync.RWMutex
	eventTypes map[string]model.EventType
	bookings   map[string]model.Booking
	owner      model.Owner
	now        func() time.Time // injectable clock for tests
}

// New returns an empty store with the given owner profile.
func New(owner model.Owner) *Store {
	return &Store{
		eventTypes: make(map[string]model.EventType),
		bookings:   make(map[string]model.Booking),
		owner:      owner,
		now:        time.Now,
	}
}

// SetClock overrides the time source (tests only).
func (s *Store) SetClock(now func() time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.now = now
}

// Owner returns the single, pre-seeded owner profile.
func (s *Store) Owner() model.Owner {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.owner
}

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

// ListEventTypes returns all event types sorted by id for stable output.
func (s *Store) ListEventTypes() []model.EventType {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]model.EventType, 0, len(s.eventTypes))
	for _, et := range s.eventTypes {
		out = append(out, et)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

// GetEventType returns the event type by id.
func (s *Store) GetEventType(id string) (model.EventType, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	et, ok := s.eventTypes[id]
	if !ok {
		return model.EventType{}, ErrEventTypeNotFound
	}
	return et, nil
}

// CreateEventType stores a new event type. The id must be unique.
func (s *Store) CreateEventType(in model.EventTypeCreate) (model.EventType, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.eventTypes[in.ID]; ok {
		return model.EventType{}, ErrEventTypeExists
	}
	et := model.EventType{
		ID:              in.ID,
		Title:           in.Title,
		Description:     in.Description,
		DurationMinutes: in.DurationMinutes,
	}
	s.eventTypes[et.ID] = et
	return et, nil
}

// UpdateEventType applies a partial update; only non-nil fields change.
func (s *Store) UpdateEventType(id string, in model.EventTypeUpdate) (model.EventType, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	et, ok := s.eventTypes[id]
	if !ok {
		return model.EventType{}, ErrEventTypeNotFound
	}
	if in.Title != nil {
		et.Title = *in.Title
	}
	if in.Description != nil {
		et.Description = *in.Description
	}
	if in.DurationMinutes != nil {
		et.DurationMinutes = *in.DurationMinutes
	}
	s.eventTypes[id] = et
	return et, nil
}

// DeleteEventType removes an event type by id.
func (s *Store) DeleteEventType(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.eventTypes[id]; !ok {
		return ErrEventTypeNotFound
	}
	delete(s.eventTypes, id)
	return nil
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

// Slots returns the 14-day availability grid for an event type. Optional
// from/to clamp the visible range within the window.
func (s *Store) Slots(eventTypeID string, from, to *time.Time) ([]model.Slot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	et, ok := s.eventTypes[eventTypeID]
	if !ok {
		return nil, ErrEventTypeNotFound
	}
	return slots.Generate(et, s.bookingsSlice(), s.now().UTC(), from, to), nil
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

// ListBookings returns all bookings sorted by start (then id for ties).
func (s *Store) ListBookings() []model.Booking {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := s.bookingsSlice()
	sort.Slice(out, func(i, j int) bool {
		if out[i].Start.Equal(out[j].Start) {
			return out[i].ID < out[j].ID
		}
		return out[i].Start.Before(out[j].Start)
	})
	return out
}

// CreateBooking validates all business rules atomically and stores the booking.
// Order of checks matches the contract's documented error precedence.
func (s *Store) CreateBooking(in model.BookingCreate) (model.Booking, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	et, ok := s.eventTypes[in.EventTypeID]
	if !ok {
		return model.Booking{}, ErrEventTypeNotFound
	}

	now := s.now().UTC()
	start := in.Start.UTC()
	step := time.Duration(et.DurationMinutes) * time.Minute

	if !slots.InWindow(start, now, step) {
		return model.Booking{}, ErrOutOfWindow
	}
	if !slots.IsAligned(start, now, step) {
		return model.Booking{}, ErrNotAligned
	}

	end := start.Add(step)
	for _, b := range s.bookings {
		if slots.Overlaps(start, end, b.Start, b.End) {
			return model.Booking{}, ErrSlotTaken
		}
	}

	booking := model.Booking{
		ID:          id.New(),
		EventTypeID: in.EventTypeID,
		Start:       start,
		End:         end,
		GuestName:   in.GuestName,
		GuestEmail:  in.GuestEmail,
		CreatedAt:   now,
	}
	s.bookings[booking.ID] = booking
	return booking, nil
}

// DeleteBooking removes a booking by id.
func (s *Store) DeleteBooking(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.bookings[id]; !ok {
		return ErrBookingNotFound
	}
	delete(s.bookings, id)
	return nil
}

// bookingsSlice copies the bookings map to a slice. Caller must hold the lock.
func (s *Store) bookingsSlice() []model.Booking {
	out := make([]model.Booking, 0, len(s.bookings))
	for _, b := range s.bookings {
		out = append(out, b)
	}
	return out
}
