// Package id generates random identifiers without external dependencies.
package id

import (
	"crypto/rand"
	"encoding/hex"
)

// New returns a random 16-byte identifier encoded as a 32-char hex string.
func New() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand should never fail; panic surfaces a misconfigured runtime.
		panic("id: crypto/rand failed: " + err.Error())
	}
	return hex.EncodeToString(b)
}
