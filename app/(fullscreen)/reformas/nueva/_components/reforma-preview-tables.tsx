import type { ReformaPreviewBudgetRow, ReformaPreviewInfoRow } from "../_lib/reform-preview";

/** Tabla estilo documento oficial (Excel/PDF de la reforma): usada tanto en el
 * panel "Antes" de cada evento como en el preview imprimible final, para que
 * ambos se vean exactamente igual. */
export function ReformaPreviewInfoTable({
  title,
  rows,
}: {
  title: string;
  rows: ReformaPreviewInfoRow[];
}) {
  return (
    <div className="border border-slate-400">
      <div className="border-b border-slate-400 bg-slate-100 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-900">
        {title}
      </div>
      <table className="w-full border-collapse text-[10px] text-slate-900">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="w-[34%] border-r border-t border-slate-400 px-2 py-1 font-bold uppercase">
                {row.label}
              </td>
              <td
                className={`border-t border-slate-400 px-2 py-1 uppercase ${
                  row.changed ? "bg-amber-50 font-semibold text-amber-900" : ""
                }`}
              >
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReformaPreviewBudgetTable({
  rows,
  total,
}: {
  rows: ReformaPreviewBudgetRow[];
  total: string;
}) {
  return (
    <div className="border border-slate-400 border-t-0">
      <div className="border-b border-slate-400 px-2 py-1 text-center text-[10px] font-bold uppercase text-slate-900">
        Presupuesto
      </div>
      <table className="w-full border-collapse text-[10px] text-slate-900">
        <thead>
          <tr className="bg-slate-100">
            <th className="w-[22%] border-r border-slate-400 px-1 py-1 text-left font-bold uppercase">
              Codigo
            </th>
            <th className="border-r border-slate-400 px-1 py-1 text-left font-bold uppercase">Item</th>
            <th className="w-[18%] border-r border-slate-400 px-1 py-1 text-left font-bold uppercase">
              Mes
            </th>
            <th className="w-[24%] px-1 py-1 text-right font-bold uppercase">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <tr key={`${row.codigo}-${index}`}>
                <td className="border-r border-t border-slate-400 px-1 py-1 align-top">{row.codigo}</td>
                <td
                  className={`border-r border-t border-slate-400 px-1 py-1 align-top ${
                    row.changed ? "bg-amber-50 font-semibold text-amber-900" : ""
                  }`}
                >
                  {row.item}
                </td>
                <td
                  className={`border-r border-t border-slate-400 px-1 py-1 align-top ${
                    row.changed ? "bg-amber-50 font-semibold text-amber-900" : ""
                  }`}
                >
                  {row.mes}
                </td>
                <td
                  className={`border-t border-slate-400 px-1 py-1 text-right align-top ${
                    row.changed ? "bg-amber-50 font-semibold text-amber-900" : ""
                  }`}
                >
                  {row.valor}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="border-t border-slate-400 px-2 py-3 text-center text-slate-500">
                Sin items presupuestarios
              </td>
            </tr>
          )}
          <tr className="bg-slate-50 font-bold">
            <td
              colSpan={3}
              className="border-r border-t border-slate-400 px-1 py-1 text-right uppercase"
            >
              Valor total del evento
            </td>
            <td className="border-t border-slate-400 px-1 py-1 text-right">{total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
