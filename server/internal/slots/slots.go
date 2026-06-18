// Package slots computes the 14-day availability grid from the booking window.
package slots

import (
	"time"

	"calendar-booking/server/internal/model"
)

// WindowDays is the fixed availability window: 14 days from now, 24/7.
const WindowDays = 14

// gridUnit is the granularity the window start is snapped to. Snapping to the
// minute eliminates sub-second jitter in "now" across requests.
const gridUnit = time.Minute

// WindowStart returns the start of the booking window: now truncated to the
// current minute. Past-slot checks are done separately via InWindow.
func WindowStart(now time.Time) time.Time {
	return now.UTC().Truncate(gridUnit)
}

// GridOrigin returns a round time anchor for grid alignment: the start of the
// current UTC day. All slots align to step boundaries from this origin.
func GridOrigin(now time.Time) time.Time {
	n := now.UTC()
	return time.Date(n.Year(), n.Month(), n.Day(), 0, 0, 0, 0, time.UTC)
}

// WindowEnd returns the end of the booking window: WindowStart + 14 days.
func WindowEnd(now time.Time) time.Time {
	return WindowStart(now).Add(WindowDays * 24 * time.Hour)
}

// IsAligned reports whether start sits on the grid: a whole number of steps
// from the grid origin and not before the window start.
func IsAligned(start, now time.Time, step time.Duration) bool {
	if step <= 0 {
		return false
	}
	if start.Before(WindowStart(now)) {
		return false
	}
	delta := start.Sub(GridOrigin(now))
	return delta%step == 0
}

// InWindow reports whether [start, start+step) fits within [windowStart, windowEnd].
func InWindow(start, now time.Time, step time.Duration) bool {
	if start.Before(WindowStart(now)) {
		return false
	}
	return !start.Add(step).After(WindowEnd(now))
}

// Overlaps reports whether [aStart, aEnd) intersects [bStart, bEnd).
// Adjacent intervals (touching at a boundary) do not overlap.
func Overlaps(aStart, aEnd, bStart, bEnd time.Time) bool {
	return aStart.Before(bEnd) && bStart.Before(aEnd)
}

// Generate builds the slot grid for an event type within [now, now+14d].
// Each slot is step=durationMinutes long; occupied slots are returned with
// Available=false. Optional from/to clamp the visible range to the window.
func Generate(et model.EventType, bookings []model.Booking, now time.Time, from, to *time.Time) []model.Slot {
	step := time.Duration(et.DurationMinutes) * time.Minute
	if step <= 0 {
		return nil
	}

	windowStart := WindowStart(now)
	windowEnd := WindowEnd(now)
	gridOrigin := GridOrigin(now)

	rangeStart := windowStart
	if from != nil && from.After(rangeStart) {
		rangeStart = *from
	}
	rangeEnd := windowEnd
	if to != nil && to.Before(rangeEnd) {
		rangeEnd = *to
	}

	// Snap the first slot up to the next grid boundary from the round origin.
	first := rangeStart
	delta := first.Sub(gridOrigin)
	if delta%step != 0 {
		steps := delta/step + 1
		first = gridOrigin.Add(steps * step)
	}

	var slots []model.Slot
	for s := first; !s.Add(step).After(rangeEnd); s = s.Add(step) {
		end := s.Add(step)
		available := true
		for _, b := range bookings {
			if Overlaps(s, end, b.Start, b.End) {
				available = false
				break
			}
		}
		slots = append(slots, model.Slot{Start: s, End: end, Available: available})
	}
	return slots
}
