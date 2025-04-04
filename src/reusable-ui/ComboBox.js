"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DialogTrigger } from "@/components/ui/dialog";

const exampleOptions = [
  {
    value: "next.js",
    label: "Next.js",
  },
];

export function Combobox({
  options,
  value,
  setValue,
  label,
  searchLabel = "Search",
  select = false,
  createButton = false,
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild className="relative">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {label && (
            <label className="block mb-2 text-xs absolute top-[-10px] left-0 text-gray-600">
              {label}
            </label>
          )}
          {value
            ? options.find((framework) => framework.value === value)?.label
            : options[0].label}

          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          {!select && <CommandInput placeholder={`Search ${searchLabel}`} />}
          <CommandEmpty>No {searchLabel} found.</CommandEmpty>
          <CommandGroup>
            {options.map((framework) => (
              <CommandItem
                key={framework.value}
                value={framework.value}
                onSelect={(currentValue) => {
                  setValue(currentValue === value ? "" : currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === framework.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {framework.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {createButton && (
            <CommandGroup>
              <DialogTrigger asChild>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setShowNewTeamDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create New
                </CommandItem>
              </DialogTrigger>
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
