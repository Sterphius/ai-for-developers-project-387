package httpapi

import (
	"encoding/json"
	"log"
	"net/http"

	"calendar-booking/server/internal/model"
)

// writeJSON writes v as JSON with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("httpapi: encode response: %v", err)
	}
}

// writeError writes the contract's Error envelope with the given status.
func writeError(w http.ResponseWriter, status int, code model.ErrorCode, message string) {
	writeJSON(w, status, model.APIError{Code: code, Message: message})
}

// decodeJSON parses the request body into dst, rejecting unknown fields.
func decodeJSON(r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}
