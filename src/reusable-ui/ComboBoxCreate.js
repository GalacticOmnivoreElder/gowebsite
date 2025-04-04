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
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function ComboBoxCreate({
  options,
  value,
  setValue,
  searchLabel = "Search",
  title,
  description,
  onSave,
  select = false,
  fullWidth = false,
}) {
  const [open, setOpen] = React.useState(false);
  const [showDialog, setShowDialog] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const dropdownBtnClass = `w-[200px] justify-between ${
    fullWidth && "w-[100%]"
  }`;

  console.log({ options, value });
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={dropdownBtnClass}
          >
            {value
              ? options.find(
                  (framework) =>
                    framework.value.toLowerCase() == value.toLowerCase()
                )?.label
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
            <CommandSeparator />
            <CommandGroup>
              <DialogTrigger asChild>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setShowDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create New
                </CommandItem>
              </DialogTrigger>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div>
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <Label htmlFor="name">Trigger Name</Label>
              <Input
                id="name"
                placeholder="When I feel lazy..."
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDialog(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={() => {
              setShowDialog(false);
              onSave(inputValue);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
