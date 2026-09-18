"use client";

import {
  Table,
  TableHead,
  TableBody,
  Th,
  Td,
} from "@/components/ui/table";
import { CheckCircle, AlertTriangle } from "lucide-react";
import type { UploadUsersExcelResponse } from "@/lib/api/user";
import type { UploadExcelResponse } from "@/lib/api/eventos";
import type { UploadType } from "./template-columns";

type Props = {
  type: UploadType;
  response: UploadUsersExcelResponse | UploadExcelResponse;
};

function isUsersResponse(
  type: UploadType,
  r: UploadUsersExcelResponse | UploadExcelResponse
): r is UploadUsersExcelResponse {
  return type === "usuarios";
}

export default function UploadResults({ type, response }: Props) {
  const hasErrors = response.errores && response.errores.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div
        className={`p-4 rounded-lg flex items-start gap-3 ${
          hasErrors
            ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
            : "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200"
        }`}
      >
        {hasErrors ? (
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
        )}
        <div>
          <h3 className="font-semibold text-sm">
            {hasErrors ? "Carga completada con observaciones" : "Carga exitosa"}
          </h3>
          <p className="text-sm mt-1">
            Procesados: <strong>{response.procesados}</strong> |{" "}
            Creados: <strong>{response.creados.length}</strong>
            {isUsersResponse(type, response) && (
              <>
                {" "}| Actualizados: <strong>{response.actualizados.length}</strong>
              </>
            )}
          </p>
          {isUsersResponse(type, response) &&
            response.disciplinasCreadas?.length ? (
              <p className="text-sm mt-1">
                Disciplinas creadas:{" "}
                <strong>{response.disciplinasCreadas.join(", ")}</strong>
              </p>
            ) : null}
        </div>
      </div>

      {/* Errors table */}
      {hasErrors && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Errores ({response.errores.length})
            </h4>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <Table density="dense" className="min-w-full">
              <TableHead>
                <tr>
                  <Th>
                    Fila
                  </Th>
                  <Th>
                    Detalle
                  </Th>
                </tr>
              </TableHead>
              <TableBody>
                {response.errores.map((err, idx) => (
                  <tr key={idx}>
                    <Td className="font-medium">
                      {err.fila}
                    </Td>
                    <Td className="text-red-600 dark:text-red-400">
                      {err.error}
                    </Td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
