import { Link, Outlet } from "react-router-dom";
import { CalendarDays, Settings } from "lucide-react";

export function Layout() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <CalendarDays className="h-5 w-5" />
            Календарь бронирования
          </Link>
          <Link
            to="/admin"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            Кабинет владельца
          </Link>
        </div>
      </header>
      <main className="container py-8">
        <Outlet />
      </main>
    </div>
  );
}
