function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
    />
  );
}

function BoneLight({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse ${className}`}
    />
  );
}

function FieldSkeleton() {
  return (
    <div>
      <Bone className="h-4 w-24 mb-2" />
      <BoneLight className="h-10 w-full" />
    </div>
  );
}

function SectionHeader({
  titleWidth = "w-40",
  subtitleWidth = "w-60",
  borderTop = false,
}: {
  titleWidth?: string;
  subtitleWidth?: string;
  borderTop?: boolean;
}) {
  return (
    <div
      className={`px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 ${
        borderTop ? "border-t" : ""
      }`}
    >
      <Bone className={`h-5 ${titleWidth} mb-1`} />
      <BoneLight className={`h-4 ${subtitleWidth}`} />
    </div>
  );
}

export default function EventoFormSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
      {/* Informacion del evento */}
      <SectionHeader titleWidth="w-48" subtitleWidth="w-64" />
      <div className="p-5 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <FieldSkeleton />
        <div className="grid md:grid-cols-2 gap-4">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      </div>

      {/* Ubicacion */}
      <SectionHeader titleWidth="w-32" subtitleWidth="w-56" borderTop />
      <div className="p-5 space-y-4">
        <FieldSkeleton />
        <div className="grid md:grid-cols-3 gap-4">
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      </div>

      {/* Fechas */}
      <SectionHeader titleWidth="w-24" subtitleWidth="w-52" borderTop />
      <div className="p-5">
        <div className="grid md:grid-cols-2 gap-4">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      </div>

      {/* Participantes */}
      <SectionHeader titleWidth="w-36" subtitleWidth="w-64" borderTop />
      <div className="p-5">
        <div className="grid md:grid-cols-2 gap-4">
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      </div>

      {/* Archivo */}
      <SectionHeader titleWidth="w-36" subtitleWidth="w-64" borderTop />
      <div className="p-5">
        <BoneLight className="h-10 w-44" />
      </div>

      {/* Submit */}
      <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700/60">
        <div className="flex justify-end">
          <Bone className="h-10 w-36" />
        </div>
      </div>
    </div>
  );
}
