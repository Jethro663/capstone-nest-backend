import * as React from "react";
import { cn } from "./utils";

const PopoverContext = React.createContext(null);

function Popover({ children, open, onOpenChange, ...props }) {
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
    <PopoverContext.Provider value={{ isOpen, handleOpenChange }}>
      <div className="relative inline-block" data-slot="popover">
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

function PopoverTrigger({ children, ...props }) {
  const { isOpen, handleOpenChange } = React.useContext(PopoverContext);
  return React.cloneElement(children, {
    onClick: (e) => {
      children.props.onClick?.(e);
      handleOpenChange(!isOpen);
    },
    ...props
  });
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}) {
  const { isOpen, handleOpenChange } = React.useContext(PopoverContext);
  const contentRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (contentRef.current && !contentRef.current.contains(event.target)) {
        handleOpenChange(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={contentRef}
      data-slot="popover-content"
      className={cn(
        "bg-popover text-popover-foreground absolute z-50 w-72 rounded-md border p-4 shadow-md outline-none",
        "top-full mt-2", // Simple positioning
        className,
      )}
      {...props}
    />
  );
}

function PopoverAnchor({ children, ...props }) {
  return <div data-slot="popover-anchor" {...props}>{children}</div>;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
