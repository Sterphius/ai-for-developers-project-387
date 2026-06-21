package slots

import (
	"testing"
	"time"

	"calendar-booking/server/internal/model"
)

func mustTime(t *testing.T, s string) time.Time {
	t.Helper()
	v, err := time.Parse(time.RFC3339, s)
	if err != nil {
		t.Fatalf("parse %q: %v", s, err)
	}
	return v
}

func TestGenerate_StepAndWindowBounds(t *testing.T) {
	now := mustTime(t, "2026-01-01T00:00:00Z")
	step := 30 * time.Minute

	got := Generate(step, nil, now, nil, nil)

	// 14 days, 30-min slots => 14*24*2 = 672 slots, all available.
	if len(got) != 672 {
		t.Fatalf("slot count = %d, want 672", len(got))
	}
	if !got[0].Start.Equal(now) {
		t.Errorf("first slot start = %v, want %v", got[0].Start, now)
	}
	last := got[len(got)-1]
	if last.End.After(WindowEnd(now)) {
		t.Errorf("last slot end %v exceeds window end %v", last.End, WindowEnd(now))
	}
	for _, s := range got {
		if !s.Available {
			t.Fatalf("expected all slots available, found occupied at %v", s.Start)
		}
	}
}

func TestGenerate_MarksOccupied(t *testing.T) {
	now := mustTime(t, "2026-01-01T00:00:00Z")
	step := 60 * time.Minute
	bookings := []model.Booking{{
		Start: mustTime(t, "2026-01-01T02:00:00Z"),
		End:   mustTime(t, "2026-01-01T03:00:00Z"),
	}}

	got := Generate(step, bookings, now, nil, nil)

	var occupied []time.Time
	for _, s := range got {
		if !s.Available {
			occupied = append(occupied, s.Start)
		}
	}
	if len(occupied) != 1 || !occupied[0].Equal(bookings[0].Start) {
		t.Fatalf("occupied = %v, want exactly [02:00]", occupied)
	}
}

func TestIsAligned(t *testing.T) {
	now := mustTime(t, "2026-01-01T00:00:00Z")
	step := 30 * time.Minute

	cases := []struct {
		name  string
		start string
		want  bool
	}{
		{"on grid", "2026-01-01T01:30:00Z", true},
		{"off grid", "2026-01-01T01:15:00Z", false},
		{"window start", "2026-01-01T00:00:00Z", true},
		{"before now", "2025-12-31T23:30:00Z", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := IsAligned(mustTime(t, c.start), now, step)
			if got != c.want {
				t.Errorf("IsAligned(%s) = %v, want %v", c.start, got, c.want)
			}
		})
	}
}

func TestInWindow(t *testing.T) {
	now := mustTime(t, "2026-01-01T00:00:00Z")
	step := 60 * time.Minute

	if InWindow(mustTime(t, "2025-12-31T23:00:00Z"), now, step) {
		t.Error("slot before now should be out of window")
	}
	// Last valid slot starts at now+14d-step.
	lastValid := WindowEnd(now).Add(-step)
	if !InWindow(lastValid, now, step) {
		t.Error("last slot within window should be in window")
	}
	if InWindow(WindowEnd(now), now, step) {
		t.Error("slot starting at window end should be out of window")
	}
}

func TestOverlaps_AdjacentDoesNotOverlap(t *testing.T) {
	a1 := mustTime(t, "2026-01-01T01:00:00Z")
	a2 := mustTime(t, "2026-01-01T02:00:00Z")
	b1 := mustTime(t, "2026-01-01T02:00:00Z") // touches a2
	b2 := mustTime(t, "2026-01-01T03:00:00Z")
	if Overlaps(a1, a2, b1, b2) {
		t.Error("adjacent intervals must not overlap")
	}
	// Overlapping by 30 min.
	c1 := mustTime(t, "2026-01-01T01:30:00Z")
	if !Overlaps(a1, a2, c1, b2) {
		t.Error("overlapping intervals must overlap")
	}
}
