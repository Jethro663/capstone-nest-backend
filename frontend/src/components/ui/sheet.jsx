import * as React from "react";
import { XIcon } from "lucide-react";
import { cn } from "./utils";

const SheetContext = React.createContext(null);

function Sheet({ children, open, onOpenChange, ...props }) {
  const [isOpen, setIsOpen] = React.useState(open || false);

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = (val) => {
    if (open === undefined) {
      setIsOpen(val);
    }
    onOpenChange?.(val);
  };

  return (
    <SheetContext.Provider value={{ isOpen, handleOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

function SheetTrigger({ children, ...props }) {
  const { handleOpenChange } = React.useContext(SheetContext);
  return React.cloneElement(children, {
    onClick: (e) => {
      children.props.onClick?.(e);
      handleOpenChange(true);
    },
    ...props
  });
}

function SheetClose({ children, ...props }) {
  const { handleOpenChange } = React.useContext(SheetContext);
  if (!children) return null;
  return React.cloneElement(children, {
    onClick: (e) => {
      children.props.onClick?.(e);
      handleOpenChange(false);
    },
    ...props
  });
}

function SheetPortal({ children }) {
  return <div data-slot="sheet-portal">{children}</div>;
}

function SheetOverlay({ className, ...props }) {
  const { isOpen, handleOpenChange } = React.useContext(SheetContext);
  if (!isOpen) return null;
  return (
    <div
      onClick={() => handleOpenChange(false)}
      className={cn(
        "fixed inset-0 z-50 bg-black/50 transition-opacity",
        className
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}) {
  const { isOpen, handleOpenChange } = React.useContext(SheetContext);
  if (!isOpen) return null;

  return (
    <SheetPortal>
      <SheetOverlay />
      <div
        data-slot="sheet-content"
        className={cn(
          "bg-background fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out duration-300",
          side === "right" && "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          side === "left" && "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top" && "inset-x-0 top-0 h-auto border-b",
          side === "bottom" && "inset-x-0 bottom-0 h-auto border-t",
          className,
        )}
        {...props}
      >
        {children}
        <button
          onClick={() => handleOpenChange(false)}
          className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 outline-none"
        >
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }) {
  return (
    <h2
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }) {
  return (
    <p
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
