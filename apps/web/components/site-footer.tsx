export function SiteFooter() {
  return (
    <footer className="bg-ink-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 font-meter text-xs text-surface-card sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} DHAKA TESLA POOL</p>
        <p>MVP BUILD — NOT AFFILIATED WITH TESLA, INC.</p>
      </div>
    </footer>
  );
}
