import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

const envBase = import.meta.env.VITE_API_BASE_URL;
// В production (без VITE_API_BASE_URL) — относительные URL, тот же origin.
export const API_BASE_URL = envBase || "";

export const api = createClient<paths>({ baseUrl: API_BASE_URL });

// Удобные алиасы типов из контракта.
export type EventType = components["schemas"]["EventType"];
export type EventTypeCreate = components["schemas"]["EventTypeCreate"];
export type EventTypeUpdate = components["schemas"]["EventTypeUpdate"];
export type Slot = components["schemas"]["Slot"];
export type Booking = components["schemas"]["Booking"];
export type BookingCreate = components["schemas"]["BookingCreate"];
export type Owner = components["schemas"]["Owner"];
export type ApiError = components["schemas"]["Error"];
export type ErrorCode = components["schemas"]["ErrorCode"];
