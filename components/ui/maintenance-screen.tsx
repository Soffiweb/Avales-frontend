import Image from "next/image";

export function MaintenanceScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl shadow-slate-950/40 backdrop-blur">
        <Image
          src="/images/LogoFedeLoja.png"
          alt="Federacion Deportiva de Loja"
          width={72}
          height={72}
          priority
          className="mx-auto mb-6 h-[72px] w-[72px] object-contain"
        />
        <span className="mb-4 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
          Mantenimiento
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Sistema en mantenimiento
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          Estamos realizando trabajos de actualizacion. Intenta ingresar
          nuevamente en unos minutos.
        </p>
      </div>
    </main>
  );
}
