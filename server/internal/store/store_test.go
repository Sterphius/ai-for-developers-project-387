package store

import (
	"errors"
	"testing"
	"time"

	"calendar-booking/server/internal/model"
)

func newTestStore(t *testing.T, now time.Time) *Store {
	t.Helper()
	s := New(model.Owner{ID: "owner", Name: "Test", Email: "t@example.com"})
	s.SetClock(func() time.Time { return now })
	return s
}

func mustTime(t *testing.T, s string) time.Time {
	t.Helper()
	v, err := time.Parse(time.RFC3339, s)
	if err != nil {
		t.Fatalf("parse %q: %v", s, err)
	}
	return v
}

func seedET(t *testing.T, s *Store, id string, dur int32) {
	t.Helper()
	if _, err := s.CreateEventType(model.EventTypeCreate{ID: id, Title: id, DurationMinutes: dur}); err != nil {
		t.Fatalf("seed event type: %v", err)
	}
}

func TestCreateEventType_DuplicateID(t *testing.T) {
	s := newTestStore(t, time.Now())
	seedET(t, s, "intro", 30)
	_, err := s.CreateEventType(model.EventTypeCreate{ID: "intro", Title: "dup", DurationMinutes: 15})
	if !errors.Is(err, ErrEventTypeExists) {
		t.Fatalf("err = %v, want ErrEventTypeExists", err)
	}
}

func TestUpdateEventType_Partial(t *testing.T) {
	s := newTestStore(t, time.Now())
	seedET(t, s, "intro", 30)
	newTitle := "Updated"
	got, err := s.UpdateEventType("intro", model.EventTypeUpdate{Title: &newTitle})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if got.Title != "Updated" {
		t.Errorf("title = %q, want Updated", got.Title)
	}
	if got.DurationMinutes != 30 {
		t.Errorf("duration = %d, want 30 (unchanged)", got.DurationMinutes)
	}
}

func TestUpdateEventType_NotFound(t *testing.T) {
	s := newTestStore(t, time.Now())
	_, err := s.UpdateEventType("missing", model.EventTypeUpdate{})
	if !errors.Is(err, ErrEventTypeNotFound) {
		t.Fatalf("err = %v, want ErrEventTypeNotFound", err)
	}
}

func TestCreateBooking_EventTypeNotFound(t *testing.T) {
	now := mustTime(t, "2026-01-01T00:00:00Z")
	s := newTestStore(t, now)
	_, err := s.CreateBooking(model.BookingCreate{EventTypeID: "nope", Start: now})
	if !errors.Is(err, ErrEventTypeNotFound) {
		t.Fatalf("err = %v, want ErrEventTypeNotFound", err)
	}
}

func TestCreateBooking_OutOfWindow(t *testing.T) {
	now := mustTime(t, "2026-01-01T00:00:00Z")
	s := newTestStore(t, now)
	seedET(t, s, "intro", 30)

	// Before now.
	_, err := s.CreateBooking(model.BookingCreate{
		EventTypeID: "intro", Start: now.Add(-30 * time.Minute),
	})
	if !errors.Is(err, ErrOutOfWindow) {
		t.Fatalf("past: err = %v, want ErrOutOfWindow", err)
	}

	// Beyond 14 days.
	_, err = s.CreateBooking(model.BookingCreate{
		EventTypeID: "intro", Start: now.Add(15 * 24 * time.Hour),
	})
	if !errors.Is(err, ErrOutOfWindow) {
		t.Fatalf("future: err = %v, want ErrOutOfWindow", err)
	}
}

func TestCreateBooking_NotAligned(t *testing.T) {
	now := mustTime(t, "2026-01-01T00:00:00Z")
	s := newTestStore(t, now)
	seedET(t, s, "intro", 30)
	_, err := s.CreateBooking(model.BookingCreate{
		EventTypeID: "intro", Start: now.Add(15 * time.Minute), // off-grid
	})
	if !errors.Is(err, ErrNotAligned) {
		t.Fatalf("err = %v, want ErrNotAligned", err)
	}
}

func TestCreateBooking_SlotTakenAcrossTypes(t *testing.T) {
	now := mustTime(t, "2026-01-01T00:00:00Z")
	s := newTestStore(t, now)
	seedET(t, s, "intro", 60)
	seedET(t, s, "consult", 30) // different type, overlapping time

	start := now.Add(2 * time.Hour)
	if _, err := s.CreateBooking(model.BookingCreate{
		EventTypeID: "intro", Start: start, GuestName: "A", GuestEmail: "a@x.io",
	}); err != nil {
		t.Fatalf("first booking: %v", err)
	}

	// Overlapping booking of a *different* type must be rejected.
	_, err := s.CreateBooking(model.BookingCreate{
		EventTypeID: "consult", Start: start, GuestName: "B", GuestEmail: "b@x.io",
	})
	if !errors.Is(err, ErrSlotTaken) {
		t.Fatalf("err = %v, want ErrSlotTaken", err)
	}
}

func TestCreateBooking_AdjacentAllowed(t *testing.T) {
	now := mustTime(t, "2026-01-01T00:00:00Z")
	s := newTestStore(t, now)
	seedET(t, s, "intro", 60)

	first := now.Add(1 * time.Hour)
	if _, err := s.CreateBooking(model.BookingCreate{
		EventTypeID: "intro", Start: first, GuestName: "A", GuestEmail: "a@x.io",
	}); err != nil {
		t.Fatalf("first: %v", err)
	}
	// Starts exactly when the first ends — adjacent, allowed.
	if _, err := s.CreateBooking(model.BookingCreate{
		EventTypeID: "intro", Start: first.Add(1 * time.Hour), GuestName: "B", GuestEmail: "b@x.io",
	}); err != nil {
		t.Fatalf("adjacent booking should be allowed, got %v", err)
	}
}

func TestListBookings_SortedByStart(t *testing.T) {
	now := mustTime(t, "2026-01-01T00:00:00Z")
	s := newTestStore(t, now)
	seedET(t, s, "intro", 60)

	later := now.Add(5 * time.Hour)
	earlier := now.Add(1 * time.Hour)
	if _, err := s.CreateBooking(model.BookingCreate{EventTypeID: "intro", Start: later, GuestName: "L", GuestEmail: "l@x.io"}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateBooking(model.BookingCreate{EventTypeID: "intro", Start: earlier, GuestName: "E", GuestEmail: "e@x.io"}); err != nil {
		t.Fatal(err)
	}

	got := s.ListBookings()
	if len(got) != 2 || !got[0].Start.Equal(earlier) || !got[1].Start.Equal(later) {
		t.Fatalf("bookings not sorted by start: %+v", got)
	}
}

func TestDeleteBooking_NotFound(t *testing.T) {
	s := newTestStore(t, time.Now())
	if err := s.DeleteBooking("missing"); !errors.Is(err, ErrBookingNotFound) {
		t.Fatalf("err = %v, want ErrBookingNotFound", err)
	}
}
