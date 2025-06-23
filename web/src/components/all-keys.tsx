"use client";

import { Check, ChevronsUpDown } from "lucide-react"
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Progress } from './loading';

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface AllKeysProps {
  value: string;
  setValue: (value: string) => void;
}

export default function AllKeys({ value, setValue }: AllKeysProps) {
  const [loading, setLoading] = useState(false);
  const [keys, setKeys] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const { udid } = useParams();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/os/${udid}/keys`)
      .then(res => res.text())
      .then(keys => {
        setKeys(keys.split('\n'));
        setLoading(false);
      });
  }, [udid]);

  return (
    <div className="space-y-4">
      {loading ? (
        <Progress indeterminate value={100} />
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[600px] justify-between"
            >
              {value
                ? keys.find((key) => key === value)
                : "Select an entitlement key"}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[600px] p-0">
            <Command>
              <CommandInput placeholder="Search by entitlement..." className="h-9" />
              <CommandList>
                <CommandEmpty>Entitlement keys failed to load.</CommandEmpty>
                <CommandGroup>
                  {keys.map((k) => (
                    <CommandItem
                      key={k}
                      value={k}
                      onSelect={(currentValue) => {
                        setValue(currentValue === value ? "" : currentValue)
                        setOpen(false)
                      }}
                    >
                      {k}
                      <Check
                        className={cn(
                          "ml-auto",
                          value === k ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}