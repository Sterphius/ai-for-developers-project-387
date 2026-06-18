import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { EventTypesPage } from "./pages/guest/EventTypesPage";
import { BookingPage } from "./pages/guest/BookingPage";
import { BookingSuccessPage } from "./pages/guest/BookingSuccessPage";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { EventTypesAdminPage } from "./pages/admin/EventTypesAdminPage";
import { BookingsPage } from "./pages/admin/BookingsPage";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <EventTypesPage /> },
      { path: "/book/:eventTypeId", element: <BookingPage /> },
      { path: "/book/:eventTypeId/success", element: <BookingSuccessPage /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <EventTypesAdminPage /> },
      { path: "bookings", element: <BookingsPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
