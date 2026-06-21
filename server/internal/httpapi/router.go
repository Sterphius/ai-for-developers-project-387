// Package httpapi wires the HTTP layer to the in-memory store. Routes mirror
// the OpenAPI contract (calendar-booking-spec) one-to-one.
package httpapi

import "net/http"

// Server holds dependencies shared by handlers.
type Server struct {
	store storeAPI
}

// New returns a Server backed by the given store.
func New(s storeAPI) *Server {
	return &Server{store: s}
}

// Handler builds the full http.Handler with routes and middleware applied.
// corsOrigin is the allowed frontend origin (e.g. http://localhost:5173).
func (s *Server) Handler(corsOrigin string) http.Handler {
	mux := http.NewServeMux()

	// Public (guest) — /api
	mux.HandleFunc("GET /api/event-types", s.listEventTypes)
	mux.HandleFunc("GET /api/event-types/{id}", s.getEventType)
	mux.HandleFunc("GET /api/event-types/{id}/slots", s.getSlots)
	mux.HandleFunc("POST /api/bookings", s.createBooking)

	// Admin (owner) — /api/admin
	mux.HandleFunc("POST /api/admin/event-types", s.createEventType)
	mux.HandleFunc("GET /api/admin/event-types", s.adminListEventTypes)
	mux.HandleFunc("GET /api/admin/event-types/{id}", s.adminGetEventType)
	mux.HandleFunc("PATCH /api/admin/event-types/{id}", s.updateEventType)
	mux.HandleFunc("DELETE /api/admin/event-types/{id}", s.deleteEventType)
	mux.HandleFunc("GET /api/admin/bookings", s.listBookings)
	mux.HandleFunc("DELETE /api/admin/bookings/{id}", s.deleteBooking)
	mux.HandleFunc("GET /api/admin/owner", s.getOwner)

	root := http.NewServeMux()
	root.Handle("/api/", recoverPanic(logRequests(cors(corsOrigin, mux))))
	root.Handle("/", staticHandler())
	return root
}
