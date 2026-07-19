"use client";

import { ArrowDownAZ, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SortDropdownOption<T extends string> {
  label: string;
  value: T;
}

export function SortDropdown<T extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
}: {
  value: T;
  options: Array<SortDropdownOption<T>>;
  onValueChange: (value: T) => void;
  ariaLabel: string;
}) {
  const selectedLabel: string =
    options.find((option) => option.value === value)?.label ?? value;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-12 min-w-44 justify-between rounded-xl bg-card px-3 font-normal shadow-none"
          aria-label={ariaLabel}
        >
          <span className="flex min-w-0 items-center gap-2">
            <ArrowDownAZ className="size-4 shrink-0 text-stone-500" />
            <span className="truncate">{selectedLabel}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-stone-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) => onValueChange(nextValue as T)}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
