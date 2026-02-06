import * as React from "react";
import { cn } from "./utils";

function TooltipProvider({ children }) {
  return <>{children}</>;
}

function Tooltip({ children, ...props }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      data-slot="tooltip"
    >
      {React.Children.map(children, child => {
        if (child.type === TooltipTrigger) {
          return child;
        }
        if (child.type === TooltipContent && isOpen) {
          return child;
        }
        return null;
      })}
    </div>
  );
}

function TooltipTrigger({ children, asChild, ...props }) {
  if (asChild) {
    return React.cloneElement(children, props);
  }
  return <span data-slot="tooltip-trigger" {...props}>{children}</span>;
}

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}) {
  return (
    <div
      data-slot="tooltip-content"
      className={cn(
        "bg-primary text-primary-foreground absolute z-50 w-fit rounded-md px-3 py-1.5 text-xs whitespace-nowrap",
        "bottom-full left-1/2 -translate-x-1/2 mb-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
