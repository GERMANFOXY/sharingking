"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

type ProgressProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  value?: number;
};

export function Progress({ className, value = 0, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      className={cn("relative h-3 w-full overflow-hidden rounded-full bg-white/10", className)}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary transition-transform"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}