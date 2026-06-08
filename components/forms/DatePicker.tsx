"use client";

import * as React from "react";
import { Locale } from "date-fns";
import { DateRange } from "react-day-picker";
import { es } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { formatDateInputFromDate } from "@/lib/utils/formatters";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CaptionYearInput } from "../ui/daypicker-caption-year-input";

const DEFAULT_TIME_ZONE = "America/Guayaquil";
const PLAIN_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value?: string) {
  if (!value) return undefined;
  return PLAIN_DATE_RE.test(value)
    ? new Date(`${value}T00:00:00-05:00`)
    : new Date(value);
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: DEFAULT_TIME_ZONE,
  }).format(date);
}

type DatePickerProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "value" | "onChange"
> & {
  mode?: "single" | "range";
  value?: string | DateRange;
  onChange: (value?: string | DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  disableTodayHighlight?: boolean;
  locale?: Locale;
};

export default function DatePicker({
  className,
  mode = "range",
  value,
  onChange,
  placeholder,
  disabled,
  id,
  disableTodayHighlight = false,
  locale,
  ...divProps
}: DatePickerProps) {
  const activeLocale = locale ?? es;
  const selectedDate =
    mode === "single" && typeof value === "string" && value
      ? parseDate(value)
      : undefined;

  const selectedRange =
    mode === "range" && value && typeof value !== "string"
      ? (value as DateRange)
      : undefined;

  const label = React.useMemo(() => {
    if (mode === "range") {
      if (selectedRange?.from) {
        if (selectedRange.to) {
          return `${formatDateLabel(selectedRange.from)} - ${formatDateLabel(selectedRange.to)}`;
        }
        return formatDateLabel(selectedRange.from);
      }
      return placeholder ?? "Selecciona un rango de fechas";
    }

    if (selectedDate) {
      return formatDateLabel(selectedDate);
    }

    return placeholder ?? "Selecciona una fecha";
  }, [mode, placeholder, selectedDate, selectedRange, activeLocale]);

  const hasSelection =
    mode === "range" ? Boolean(selectedRange?.from) : Boolean(selectedDate);

  const handleSelectSingle = (selected: Date | undefined) => {
    onChange(selected ? formatDateInputFromDate(selected) : undefined);
  };

  const handleSelectRange = (selected: DateRange | undefined) => {
    onChange(selected);
  };

  const calendarProps =
    mode === "range"
      ? {
          mode: "range" as const,
          defaultMonth: selectedRange?.from,
          selected: selectedRange,
          required: false,
          onSelect: handleSelectRange,
        }
      : {
          mode: "single" as const,
          defaultMonth: selectedDate ?? undefined,
          selected: selectedDate,
          onSelect: handleSelectSingle,
        };

  return (
    <div className={cn("grid gap-2", className)} {...divProps}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              "btn px-2.5 min-w-[15.5rem] bg-white border-gray-200 hover:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600 dark:bg-gray-800 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 font-medium text-left justify-start",
              !hasSelection && "text-muted-foreground",
              disabled && "opacity-60 cursor-not-allowed"
            )}
          >
            <svg
              className="fill-current text-gray-400 dark:text-gray-500 ml-1 mr-2"
              width="16"
              height="16"
              viewBox="0 0 16 16"
            >
              <path d="M5 4a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H5Z"></path>
              <path d="M4 0a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V4a4 4 0 0 0-4-4H4ZM2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Z"></path>
            </svg>
            {label ? <span>{label}</span> : <span>Pick a date</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            {...calendarProps}
            disableTodayHighlight={disableTodayHighlight}
            locale={activeLocale}
            yearRange={{ from: 1920, to: 2030 }} // Opcional: definir rango
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
