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
  etapaDestinoOptions?: StageOption[];
  etapaDestinoValue?: string;
  onEtapaDestinoChange?: (value: string) => void;
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
  etapaDestinoOptions,
  etapaDestinoValue,
  onEtapaDestinoChange,
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
        <p>{`El aval pasará de "${currentStageLabel}" a "${nextStageLabel}".`}</p>
        {/* <p>{`Al aprobarlo quedará en "${nextStageLabel}".`}</p> */}
      </div>

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

      {etapaDestinoOptions &&
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
        <button
          type="button"
          disabled={actionLoading}
          onClick={onReject}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 shadow-lg hover:from-rose-500 hover:to-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Rechazar
        </button>
        <button
          type="button"
          disabled={actionLoading}
          onClick={onApprove}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg hover:from-emerald-500 hover:to-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Aprobar etapa
        </button>
      </div>
    </div>
  );
}
