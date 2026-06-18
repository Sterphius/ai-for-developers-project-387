package httpapi

import (
	"time"

	"calendar-booking/server/internal/model"
)

// storeAPI is the behavior the HTTP layer needs from the store. It is satisfied
// by *store.Store and can be faked in handler tests.
type storeAPI interface {
	ListEventTypes() []model.EventType
	GetEventType(id string) (model.EventType, error)
	CreateEventType(in model.EventTypeCreate) (model.EventType, error)
	UpdateEventType(id string, in model.EventTypeUpdate) (model.EventType, error)
	DeleteEventType(id string) error

	Slots(eventTypeID string, from, to *time.Time) ([]model.Slot, error)

	ListBookings() []model.Booking
	CreateBooking(in model.BookingCreate) (model.Booking, error)
	DeleteBooking(id string) error

	Owner() model.Owner
}
