"use client";

import { useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Users,
  CalendarDays,
  ArrowLeft,
  Loader2,
  Upload,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import {
  uploadUsersExcel,
  checkCedulas,
  type UploadUsersExcelResponse,
  type CheckCedulasResponse,
} from "@/lib/api/user";
import { uploadEventsExcel, type UploadExcelResponse } from "@/lib/api/eventos";
import { getCatalog } from "@/lib/api/catalog";
import { listRoles } from "@/lib/api/roles";
import type { CatalogItem } from "@/types/catalog";
import type { Role } from "@/types/role";
import FileDropzone from "./_components/file-dropzone";
import DataPreviewTable from "./_components/data-preview-table";
import UploadResults from "./_components/upload-results";
import TemplateDownload from "./_components/template-download";
import UploadInstructions from "@/components/ui/upload-instructions";
import {
  type UploadType,
  type ColumnDef,
  getColumnsForType,
  getUploadLabel,
  USERS_OPTIONAL_COLUMNS,
  isBudgetItemCode,
} from "./_components/template-columns";
import {
  validatePreviewRows,
  type RowIssuesByIndex,
} from "./_components/row-validation";

type Step = "select-type" | "upload-file" | "preview" | "results";

export default function CargaMasivaPage() {
  const [step, setStep] = useState<Step>("select-type");
  const [uploadType, setUploadType] = useState<UploadType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [parsedSheetName, setParsedSheetName] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [existingCedulas, setExistingCedulas] =
    useState<CheckCedulasResponse | null>(null);
  const [disciplinasCatalog, setDisciplinasCatalog] = useState<CatalogItem[]>(
    []
  );
  const [categoriasCatalog, setCategoriasCatalog] = useState<CatalogItem[]>([]);
  const [rolesCatalog, setRolesCatalog] = useState<Role[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [response, setResponse] = useState<
    UploadUsersExcelResponse | UploadExcelResponse | null
  >(null);
  const [rowIssues, setRowIssues] = useState<RowIssuesByIndex>({});
  // Dynamic columns detected from the Excel (base + budget items)
  const [detectedColumns, setDetectedColumns] = useState<ColumnDef[]>([]);

  const baseColumns: ColumnDef[] = uploadType ? getColumnsForType(uploadType) : [];
  // For events, use detected columns (includes budget items); for users, use base
  const columns: ColumnDef[] =
    uploadType === "eventos" && detectedColumns.length > 0
      ? detectedColumns
      : baseColumns;

  const ensureCatalogLoaded = useCallback(async () => {
    if (disciplinasCatalog.length > 0 || catalogLoading) {
      return {
        disciplinas: disciplinasCatalog,
        categorias: categoriasCatalog,
        roles: rolesCatalog,
      };
    }

    setCatalogLoading(true);
    try {
      const [catalogRes, rolesRes] = await Promise.all([
        getCatalog(),
        listRoles().catch(() => null),
      ]);
      const disciplinas = catalogRes.data?.disciplinas ?? [];
      const categorias = catalogRes.data?.categorias ?? [];
      const roles = rolesRes?.data ?? [];
      if (disciplinas.length === 0) {
        throw new Error("No se encontraron disciplinas en el catálogo.");
      }
      setDisciplinasCatalog(disciplinas);
      setCategoriasCatalog(categorias);
      setRolesCatalog(roles);
      return { disciplinas, categorias, roles };
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("No se pudo cargar el catálogo de disciplinas.");
    } finally {
      setCatalogLoading(false);
    }
  }, [catalogLoading, disciplinasCatalog, categoriasCatalog, rolesCatalog]);

  // Precargar catálogos al entrar al flujo de usuarios para poblar los hints.
  useEffect(() => {
    if (uploadType === "usuarios") {
      void ensureCatalogLoaded().catch(() => {});
    }
  }, [uploadType, ensureCatalogLoaded]);

  const findEventSheetName = useCallback((workbook: XLSX.WorkBook) => {
    const normalize = (value: string) => value.trim().toUpperCase();

    const namedSheet = workbook.SheetNames.find(
      (name) => normalize(name) === "EVENTOS"
    );
    if (namedSheet) return namedSheet;

    const sheetWithHeaders = workbook.SheetNames.find((name) => {
      const worksheet = workbook.Sheets[name];
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        raw: false,
      }) as string[][];

      return rawData.slice(0, 20).some((row) => {
        const normalizedRow = row.map((cell) => normalize(String(cell ?? "")));
        return normalizedRow.includes("EVENTO") && normalizedRow.includes("ACTIVIDAD");
      });
    });
    if (sheetWithHeaders) return sheetWithHeaders;

    const auxSheet = workbook.SheetNames.find((name) => {
      const normalized = normalize(name);
      return normalized.includes("AUX") && (normalized.includes("004") || normalized.includes("005"));
    });

    return auxSheet ?? workbook.SheetNames[0];
  }, []);

  const buildSanitizedUploadFile = useCallback(
    (currentFile: File, type: UploadType) => {
      const workbook = XLSX.utils.book_new();
      const sheetColumns =
        type === "eventos" && detectedColumns.length > 0
          ? detectedColumns
          : getColumnsForType(type);

      const headerRow = sheetColumns.map((col) =>
        col.itemDescription ? col.label : col.key
      );

      const dataRows = parsedRows.map((row) =>
        sheetColumns.map((col) => row[col.key] ?? "")
      );

      const sheetData =
        type === "eventos"
          ? [
              headerRow,
              sheetColumns.map((col) => col.itemDescription ?? ""),
              ...dataRows,
            ]
          : [headerRow, ...dataRows];

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      const sheetName =
        type === "eventos"
          ? parsedSheetName || "Aux 004"
          : parsedSheetName || "Hoja1";

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const arrayBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      return new File(
        [arrayBuffer],
        currentFile.name.replace(/\.(csv|xls|xlsx)$/i, "") + "-limpio.xlsx",
        {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
      );
    },
    [detectedColumns, parsedRows, parsedSheetName]
  );

  const handleSelectType = (type: UploadType) => {
    setUploadType(type);
    setStep("upload-file");
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    setUploadError(null);
    setResponse(null);
    setExistingCedulas(null);
    setRowIssues({});
    setDetectedColumns([]);
    setParsedSheetName("");
  };

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      setFile(selectedFile);
      setParseError(null);
      setUploadError(null);
      setExistingCedulas(null);
      setRowIssues({});
      setDetectedColumns([]);
      setParsedSheetName("");

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          let sheetName = workbook.SheetNames[0];
          if (uploadType === "eventos") {
            sheetName = findEventSheetName(workbook);
          }
          setParsedSheetName(sheetName);

          const worksheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
            raw: false,
          }) as string[][];

          if (!rawData || rawData.length < 2) {
            setParseError("El archivo no contiene datos suficientes.");
            setParsedRows([]);
            return;
          }

          let headerRowIndex = 0;
          if (uploadType === "eventos") {
            for (let i = 0; i < Math.min(20, rawData.length); i++) {
              const row = rawData[i];
              if (
                row?.some((c) => c?.toString().trim() === "Evento") &&
                row?.some((c) => c?.toString().trim() === "Actividad")
              ) {
                headerRowIndex = i;
                break;
              }
            }
          }

          const headers = rawData[headerRowIndex].map((h) =>
            h?.toString().trim()
          );

          // For events: detect budget item columns (codes > 100000) and their descriptions
          const currentBaseColumns = getColumnsForType(uploadType!);
          const allColumns: ColumnDef[] = [...currentBaseColumns];
          const budgetItemIndices: { colIndex: number; key: string }[] = [];

          if (uploadType === "eventos") {
            // Row after header has the item descriptions
            const descriptionRow = rawData[headerRowIndex + 1];
            for (let i = 0; i < headers.length; i++) {
              const h = headers[i] ?? "";
              if (isBudgetItemCode(h)) {
                const description =
                  descriptionRow?.[i]?.toString().trim() || "";
                const key = h; // Use the code as key (e.g. "530201")
                allColumns.push({
                  key,
                  label: h,
                  required: false,
                  itemDescription: description,
                });
                budgetItemIndices.push({ colIndex: i, key });
              }
            }
            setDetectedColumns(allColumns);
          }

          // Map column indices for base columns
          const colIndices: Record<string, number> = {};
          for (const col of currentBaseColumns) {
            const idx = headers.findIndex((h) => {
              const hUpper = h?.toUpperCase() ?? "";
              const colUpper = col.key.toUpperCase();
              return hUpper === colUpper || hUpper.includes(colUpper);
            });
            if (idx !== -1) colIndices[col.key] = idx;
          }

          // Data starts after description row for events (headerRow + 2), after header for users (headerRow + 1)
          const dataStartIndex =
            uploadType === "eventos" ? headerRowIndex + 2 : headerRowIndex + 1;

          // Parse rows
          const rows: Record<string, string>[] = [];
          for (let i = dataStartIndex; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.every((c) => !c?.toString().trim())) continue;

            if (uploadType === "eventos") {
              const firstCell = row[0]?.toString().trim().toUpperCase();
              if (firstCell === "TOTAL") break;
            }

            const mapped: Record<string, string> = {};

            for (const col of currentBaseColumns) {
              const idx = colIndices[col.key];
              mapped[col.key] =
                idx !== undefined ? (row[idx]?.toString().trim() ?? "") : "";
            }

            // Map budget item columns
            for (const item of budgetItemIndices) {
              const val = row[item.colIndex]?.toString().trim() ?? "";
              mapped[item.key] = val;
            }

            const hasMappedValues = [...currentBaseColumns, ...budgetItemIndices.map((item) => ({
              key: item.key,
            }))].some((col) => {
              const value = mapped[col.key];
              return Boolean(value?.toString().trim());
            });

            if (!hasMappedValues) continue;

            rows.push(mapped);
          }

          const { disciplinas, categorias, roles } = await ensureCatalogLoaded();
          const issues = validatePreviewRows(
            uploadType!,
            rows,
            uploadType === "eventos" ? allColumns : currentBaseColumns,
            disciplinas,
            categorias,
            roles
          );

          setParsedRows(rows);
          setRowIssues(issues);
          setStep("preview");

          if (uploadType === "usuarios" && rows.length > 0) {
            const cedulas = rows
              .map((r) => r["CEDULA"])
              .filter((c) => c && c.trim());
            if (cedulas.length > 0) {
              setChecking(true);
              try {
                const result = await checkCedulas(cedulas);
                setExistingCedulas(result.data);
              } catch {
              } finally {
                setChecking(false);
              }
            }
          }
        } catch (error) {
          setParseError(
            error instanceof Error
              ? error.message
              : "No se pudo leer el archivo. Verifica que sea un Excel valido."
          );
          setParsedRows([]);
          setRowIssues({});
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    },
    [uploadType, ensureCatalogLoaded, findEventSheetName]
  );

  const handleFileClear = () => {
    setFile(null);
      setParsedRows([]);
      setParseError(null);
      setExistingCedulas(null);
      setRowIssues({});
      setParsedSheetName("");
  };

  const handleUpload = async () => {
    if (!file || !uploadType) return;

    try {
      setUploading(true);
      setUploadError(null);
      const fileToUpload =
        uploadType === "eventos"
          ? buildSanitizedUploadFile(file, uploadType)
          : file;

      if (uploadType === "usuarios") {
        const result = await uploadUsersExcel(fileToUpload);
        setResponse(result.data);
      } else {
        const result = await uploadEventsExcel(fileToUpload);
        setResponse(result.data);
      }
      setStep("results");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al subir el archivo.";
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setStep("select-type");
    setUploadType(null);
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    setUploadError(null);
    setResponse(null);
    setExistingCedulas(null);
    setRowIssues({});
    setDetectedColumns([]);
    setParsedSheetName("");
  };

  const handleUploadAnother = () => {
    setStep("upload-file");
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    setUploadError(null);
    setResponse(null);
    setExistingCedulas(null);
    setRowIssues({});
    setDetectedColumns([]);
    setParsedSheetName("");
  };

  const rowsWithIssues = parsedRows.filter((_, index) =>
    Boolean(rowIssues[index] && Object.keys(rowIssues[index]).length > 0)
  );
  const canConfirmUpload = rowsWithIssues.length === 0 && parsedRows.length > 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {step !== "select-type" && (
            <button
              type="button"
              onClick={
                step === "upload-file"
                  ? handleReset
                  : step === "preview"
                    ? () => {
                        setStep("upload-file");
                        setParsedRows([]);
                        setExistingCedulas(null);
                        setDetectedColumns([]);
                      }
                    : handleReset
              }
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Carga Masiva
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {step === "select-type" &&
            "Selecciona el tipo de datos que deseas cargar."}
          {step === "upload-file" &&
            `Sube un archivo Excel con los datos de ${getUploadLabel(uploadType!)}.`}
          {step === "preview" &&
            "Revisa los datos antes de enviarlos. Las filas con campos obligatorios vacios o catálogos inválidos se muestran resaltadas."}
          {step === "results" && "Resultado de la carga masiva."}
        </p>
      </div>

      {/* Steps indicator */}
      {step !== "select-type" && (
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {["Tipo", "Archivo", "Verificar", "Resultado"].map((label, i) => {
              const stepIndex =
                step === "upload-file"
                  ? 1
                  : step === "preview"
                    ? 2
                    : step === "results"
                      ? 3
                      : 0;
              const isActive = i <= stepIndex;
              const isCurrent = i === stepIndex;
              return (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && (
                    <div
                      className={`w-8 h-px ${
                        isActive
                          ? "bg-indigo-500"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                  )}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      isCurrent
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                        : isActive
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent
                          ? "bg-indigo-500 text-white"
                          : isActive
                            ? "bg-indigo-200 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-300"
                            : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {i < stepIndex ? "\u2713" : i + 1}
                    </span>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step: Select Type */}
      {step === "select-type" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
          <button
            type="button"
            onClick={() => handleSelectType("usuarios")}
            className="group flex flex-col items-center gap-4 p-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg transition-all"
          >
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
              <Users className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Usuarios
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Carga masiva de usuarios con cedula, nombres, cargo y mas.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectType("eventos")}
            className="group flex flex-col items-center gap-4 p-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg transition-all"
          >
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
              <CalendarDays className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Eventos
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Carga masiva de eventos con actividad, tarea, mes y presupuesto.
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Step: Upload File */}
      {step === "upload-file" && uploadType && (
        <div className="max-w-2xl space-y-6">
          {/* Template download */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Plantilla
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Descarga la plantilla con las columnas esperadas y llena tus
              datos.
            </p>
            <TemplateDownload type={uploadType} />

            {/* Column info */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                Columnas esperadas
              </p>
              <div className="flex flex-wrap gap-2">
                {baseColumns.map((col) => (
                  <span
                    key={col.key}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      col.required
                        ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {col.key}
                    {col.required && (
                      <span className="text-rose-500 ml-0.5">*</span>
                    )}
                  </span>
                ))}
              </div>
              {uploadType === "eventos" && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Ademas, las columnas con codigos numericos (ej: 530201, 530235...) se detectan automaticamente como items presupuestarios. La fila debajo del encabezado debe tener la descripcion del item.
                </p>
              )}
              {uploadType === "usuarios" && (
                <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <p>
                    Solo se aceptan disciplinas registradas en el catalogo. Puedes enviar el codigo o el nombre exacto.
                  </p>
                  <p>
                    CATEGORIA es opcional. Si la dejas vacía, se usará TODAS.
                  </p>
                  <p>
                    Categorías válidas:{" "}
                    {categoriasCatalog.length > 0
                      ? categoriasCatalog
                          .map((c) => c.nombre)
                          .filter(Boolean)
                          .join(", ")
                      : "las registradas en el catálogo"}
                    .
                  </p>
                  <p>
                    Campos opcionales: {USERS_OPTIONAL_COLUMNS.join(", ")}.
                  </p>
                  <p>
                    Roles aceptados:{" "}
                    {rolesCatalog.length > 0
                      ? rolesCatalog
                          .map((role) => role.nombre)
                          .filter(Boolean)
                          .join(", ")
                      : "los roles válidos del sistema"}
                    .
                  </p>
                </div>
              )}

              <div className="mt-4">
                <UploadInstructions
                  type={uploadType}
                  categorias={categoriasCatalog
                    .map((c) => c.nombre)
                    .filter(Boolean)}
                />
              </div>
            </div>
          </div>

          {/* File dropzone */}
          <FileDropzone
            file={file}
            onFileSelect={handleFileSelect}
            onFileClear={handleFileClear}
          />

          {/* Parse error */}
          {parseError && (
            <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && uploadType && (
        <div className="space-y-6">
          {/* Validation summary */}
          <div className="flex flex-wrap items-center gap-4">
            {rowsWithIssues.length > 0 ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  <strong>{rowsWithIssues.length}</strong> fila
                  {rowsWithIssues.length !== 1 ? "s" : ""} con errores de validacion
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Todos los datos obligatorios y catálogos están correctos</span>
              </div>
            )}

            {checking && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando usuarios existentes...</span>
              </div>
            )}
          </div>

          {/* Data table */}
          <DataPreviewTable
            columns={columns}
            rows={parsedRows}
            existingCedulas={existingCedulas}
            rowIssues={rowIssues}
          />

          {/* Upload error */}
          {uploadError && (
            <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setStep("upload-file");
                setFile(null);
                setParsedRows([]);
                setExistingCedulas(null);
                setDetectedColumns([]);
              }}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cambiar archivo
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !canConfirmUpload}
              className={`
                flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                ${
                  uploading || !canConfirmUpload
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }
              `}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Confirmar y subir ({parsedRows.length} filas)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step: Results */}
      {step === "results" && uploadType && response && (
        <div className="max-w-2xl space-y-6">
          <UploadResults type={uploadType} response={response} />

          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Volver al inicio
            </button>
            <button
              type="button"
              onClick={handleUploadAnother}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <RotateCcw className="w-4 h-4" />
              Subir otro archivo de {getUploadLabel(uploadType)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
