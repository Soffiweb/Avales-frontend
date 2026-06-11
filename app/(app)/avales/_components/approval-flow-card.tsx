"use client";

type StageOption = {
  value: string;
  label: string;
};

type ApprovalFlowCardProps = {
  title: string;
  currentStageLabel: string;
  nextStageLabel: string;
  reasonLabel?: string;
  reasonValue: string;
  reasonPlaceholder?: string;
  actionError?: string | null;
  actionLoading?: boolean;
  onReasonChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  approveVisible?: boolean;
  approveEnabled?: boolean;
  rejectVisible?: boolean;
  rejectEnabled?: boolean;
  etapaDestinoOptions?: StageOption[];
  etapaDestinoValue?: string;
  onEtapaDestinoChange?: (value: string) => void;
  /**
   * Modo admin "fix data sin avanzar etapa". Cambia el copy a "Guardar
   * (admin)" en ambar, esconde rechazar y el motivo, y muestra un mensaje
   * aclarando que no se altera el flujo.
   */
  adminSaveOnly?: boolean;
};

export default function ApprovalFlowCard({
  title,
  currentStageLabel,
  nextStageLabel,
  reasonLabel = "Motivo (obligatorio para rechazos)",
  reasonValue,
  reasonPlaceholder = "Describe a qué se debe el rechazo...",
  actionError,
  actionLoading = false,
  onReasonChange,
  onApprove,
  onReject,
  approveVisible = true,
  approveEnabled = true,
  rejectVisible = true,
  rejectEnabled = true,
  etapaDestinoOptions,
  etapaDestinoValue,
  onEtapaDestinoChange,
  adminSaveOnly = false,
}: ApprovalFlowCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900/60 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>

      {/* <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
        <span>{currentStageLabel}</span>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <span>{nextStageLabel}</span>
      </div> */}

      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
        {adminSaveOnly ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            Modo admin: se guardará la información de esta etapa sin alterar el
            flujo de aprobación.
          </p>
        ) : (
          <p>{`El aval pasará de "${currentStageLabel}" a "${nextStageLabel}".`}</p>
        )}
      </div>

      {!adminSaveOnly && (
        <div className="space-y-2">
          <label
            htmlFor="rechazo"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {reasonLabel}
          </label>
          <textarea
            id="rechazo"
            value={reasonValue}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={3}
            className="form-textarea w-full text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder={reasonPlaceholder}
          />
        </div>
      )}

      {!adminSaveOnly &&
        etapaDestinoOptions &&
        etapaDestinoOptions.length > 0 &&
        onEtapaDestinoChange && (
          <div className="space-y-2">
            <label
              htmlFor="etapaDestino"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Regresar a etapa (opcional)
            </label>
            <select
              id="etapaDestino"
              value={etapaDestinoValue ?? ""}
              onChange={(e) => onEtapaDestinoChange(e.target.value)}
              className="form-select w-full text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md"
            >
              <option value="">Etapa anterior (por defecto)</option>
              {etapaDestinoOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Si no seleccionas una etapa, el aval regresará a la etapa
              inmediatamente anterior.
            </p>
          </div>
        )}

      {actionError && <p className="text-sm text-rose-500">{actionError}</p>}

      <div className="flex flex-wrap justify-end gap-3">
        {!adminSaveOnly && rejectVisible && (
          <button
            type="button"
            disabled={actionLoading || !rejectEnabled}
            onClick={onReject}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 shadow-lg hover:from-rose-500 hover:to-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Rechazar
          </button>
        )}
        {approveVisible && (
          <button
            type="button"
            disabled={actionLoading || !approveEnabled}
            onClick={onApprove}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              adminSaveOnly
                ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 focus-visible:outline-amber-500"
                : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 focus-visible:outline-emerald-500"
            }`}
          >
            {adminSaveOnly ? "Guardar (admin)" : "Aprobar etapa"}
          </button>
        )}
      </div>
    </div>
  );
}
