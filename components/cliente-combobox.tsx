"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, User } from "lucide-react"
import { cn } from "@/lib/utils"

export type ClienteOption = {
  id: string
  nome: string
  documento: string // CNPJ/CPF
}

export default function ClienteCombobox({
  clientes = [],
  value = "",
  onChange,
  placeholder = "Selecione um cliente",
}: {
  clientes: ClienteOption[]
  value?: string
  onChange: (nome: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const options = useMemo(() => {
    const q = query.toLowerCase().trim()
    return q
      ? clientes.filter((c) => c.nome.toLowerCase().includes(q) || (c.documento || "").toLowerCase().includes(q))
      : clientes
  }, [clientes, query])

  const selected = clientes.find((c) => c.nome === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[320px] justify-between bg-transparent"
        >
          <span className="flex min-w-0 items-center gap-2">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{value ? value : placeholder}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar nome ou CNPJ/CPF..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup heading="Clientes">
              {options.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.nome}
                  onSelect={() => {
                    onChange(c.nome)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", c.nome === value ? "opacity-100" : "opacity-0")} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{c.nome}</span>
                    {c.documento ? <span className="truncate text-xs text-muted-foreground">{c.documento}</span> : null}
                  </div>
                </CommandItem>
              ))}
              {query && (
                <CommandItem
                  key={`free-${query}`}
                  value={query}
                  onSelect={() => {
                    onChange(query)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", query === value ? "opacity-100" : "opacity-0")} />
                  Usar "{query}" (texto livre)
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
