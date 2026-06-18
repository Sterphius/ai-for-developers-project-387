// Command server runs the in-memory calendar booking backend.
// Data is held in memory and reset on restart.
package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"calendar-booking/server/internal/httpapi"
	"calendar-booking/server/internal/model"
	"calendar-booking/server/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := flag.String("addr", ":"+port, "HTTP listen address")
	corsOrigin := flag.String("cors-origin", "http://localhost:5173", "allowed CORS origin (frontend)")
	flag.Parse()

	st := store.New(model.Owner{
		ID:    "owner",
		Name:  "Agent Smith",
		Email: "owner@example.com",
	})
	seed(st)

	srv := httpapi.New(st)
	httpServer := &http.Server{
		Addr:              *addr,
		Handler:           srv.Handler(*corsOrigin),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("calendar-booking backend listening on %s (CORS origin %s)", *addr, *corsOrigin)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	// Graceful shutdown on SIGINT/SIGTERM.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
	log.Println("server stopped")
}

// seed pre-populates a couple of event types. Bookings start empty.
func seed(st *store.Store) {
	types := []model.EventTypeCreate{
		{ID: "intro-call", Title: "Вводный звонок", Description: "Короткое знакомство и обсуждение задач", DurationMinutes: 30},
		{ID: "consultation", Title: "Консультация", Description: "Подробный разбор вашего вопроса", DurationMinutes: 60},
	}
	for _, t := range types {
		if _, err := st.CreateEventType(t); err != nil {
			log.Printf("seed: %v", err)
		}
	}
}
