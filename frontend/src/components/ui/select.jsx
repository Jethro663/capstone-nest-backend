import * as React from "react";
import {
  CheckIcon,
  ChevronDownIcon,
} from "lucide-react";
import { cn } from "./utils";

const SelectContext = React.createContext(null);

function Select({
  children,
  value,
  onValueChange,
  defaultValue,
  ...props
}) {
  const [open, setOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState(value || defaultValue);

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleValueChange = (val) => {
    if (value === undefined) {
      setSelectedValue(val);
    }
    onValueChange?.(val);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ open, setOpen, selectedValue, handleValueChange }}>
      <div className="relative w-full" data-slot="select">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

function SelectGroup({ ...props }) {
  return <div data-slot="select-group" {...props} />;
}

function SelectValue({ placeholder, ...props }) {
  const { selectedValue } = React.useContext(SelectContext);
  return (
    <span data-slot="select-value" {...props}>
      {selectedValue || placeholder}
    </span>
  );
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}) {
  const { open, setOpen } = React.useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "border-input bg-input-background flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="size-4 opacity-50" />
    </button>
  );
}

function SelectContent({
  className,
  children,
  ...props
}) {
  const { open } = React.useContext(SelectContext);
  if (!open) return null;

  return (
    <div
      data-slot="select-content"
      className={cn(
        "bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full min-w-[8rem] overflow-hidden rounded-md border shadow-md",
        className,
      )}
      {...props}
    >
      <div className="p-1">{children}</div>
    </div>
  );
}

function SelectItem({
  className,
  children,
  value,
  ...props
}) {
  const { selectedValue, handleValueChange } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;

  return (
    <div
      data-slot="select-item"
      onClick={() => handleValueChange(value)}
      className={cn(
        "hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-default items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        {isSelected && <CheckIcon className="size-4" />}
      </span>
      <span>{children}</span>
    </div>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
};
