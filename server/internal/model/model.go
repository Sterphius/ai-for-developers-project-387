// Package model contains the data types that mirror the OpenAPI contract
// (calendar-booking-spec). JSON tags match the contract schema names exactly.
package model

import "time"

// ErrorCode enumerates the machine-readable error codes from the contract.
type ErrorCode string

const (
	ErrSlotTaken         ErrorCode = "SLOT_TAKEN"
	ErrEventTypeNotFound ErrorCode = "EVENT_TYPE_NOT_FOUND"
	ErrInvalidSlot       ErrorCode = "INVALID_SLOT"
	ErrBookingNotFound   ErrorCode = "BOOKING_NOT_FOUND"
)

// APIError is the single error envelope returned by every failing endpoint.
type APIError struct {
	Code    ErrorCode `json:"code"`
	Message string    `json:"message"`
}

// EventType is a bookable meeting type owned by the calendar owner.
type EventType struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	Description     string `json:"description"`
	DurationMinutes int32  `json:"durationMinutes"`
}

// EventTypeCreate is the create request body. The owner supplies the id.
type EventTypeCreate struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	Description     string `json:"description"`
	DurationMinutes int32  `json:"durationMinutes"`
}

// EventTypeUpdate is the partial-update (PATCH) body. Pointer fields let us
// distinguish "not provided" from "set to zero value".
type EventTypeUpdate struct {
	Title           *string `json:"title"`
	Description     *string `json:"description"`
	DurationMinutes *int32  `json:"durationMinutes"`
}

// Slot is a computed calendar slot. Occupied slots are returned with
// Available=false rather than omitted.
type Slot struct {
	Start     time.Time `json:"start"`
	End       time.Time `json:"end"`
	Available bool      `json:"available"`
}

// Booking is a confirmed reservation.
type Booking struct {
	ID          string    `json:"id"`
	EventTypeID string    `json:"eventTypeId"`
	Start       time.Time `json:"start"`
	End         time.Time `json:"end"`
	GuestName   string    `json:"guestName"`
	GuestEmail  string    `json:"guestEmail"`
	CreatedAt   time.Time `json:"createdAt"`
}

// BookingCreate is the booking request body. End is computed by the server.
type BookingCreate struct {
	EventTypeID string    `json:"eventTypeId"`
	Start       time.Time `json:"start"`
	GuestName   string    `json:"guestName"`
	GuestEmail  string    `json:"guestEmail"`
}

// Owner is the single, pre-seeded calendar owner profile.
type Owner struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}
