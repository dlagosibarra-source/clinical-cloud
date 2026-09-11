export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans">
      <main className="flex flex-1 w-full max-w-2xl flex-col items-center justify-center gap-6 px-8 py-32 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Clinical Cloud
        </h1>
        <p className="text-lg text-foreground/60">
          Multi-tenant SaaS platform for dental clinics.
        </p>
      </main>
    </div>
  );
}
