import type { JSXElement, Signal } from "solid-js";
import { children, createSignal, splitProps } from "solid-js";
import * as SheetPrimitive from "@kobalte/core/dialog";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";

interface SafeSheetProps {
  markDirty: (dirty?: boolean) => void;
  close: () => void;
}

interface LocalProps {
  open?: Signal<boolean>;
  children: (sheet: SafeSheetProps) => JSXElement;
}

type SafeProps = LocalProps &
  Omit<SheetPrimitive.DialogRootProps, "open" | "onOpenChange" | "children">;

export function SafeSheet(props: SafeProps) {
  const [local, others] = splitProps(props, ["children", "open"]);

  // eslint-disable-next-line solid/reactivity
  const [sheetOpen, setSheetOpen] = local.open ?? createSignal(false);
  const [dirty, setDirty] = createSignal(false);
  const [dialogOpen, setDialogOpen] = createSignal(false);

  const onSheetOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setDirty(false);
      setSheetOpen(true);
      return;
    }

    if (!dirty()) {
      setDirty(false);
      setSheetOpen(false);
      return;
    }

    // We're closing a sheet with a dirty form => open a confirmation dialog.
    setDialogOpen(true);
  };

  return (
    <Dialog
      id="confirm"
      modal={true}
      open={dialogOpen()}
      onOpenChange={setDialogOpen}
    >
      <ConfirmCloseDialog
        back={() => setDialogOpen(false)}
        confirm={() => {
          setDirty(false);
          setDialogOpen(false);
          setSheetOpen(false);
        }}
      />

      <Sheet open={sheetOpen()} onOpenChange={onSheetOpenChange} {...others}>
        {local.children({
          markDirty: (value: boolean | undefined) => setDirty(value ?? true),
          close: () => setSheetOpen(false),
        })}
      </Sheet>
    </Dialog>
  );
}

export function ConfirmCloseDialog(props: {
  back: () => void;
  confirm: () => void;
  message?: string;
}) {
  return (
    <DialogContent>
      <DialogTitle>Confirmation</DialogTitle>

      <p>{props.message ?? "Are you sure?"}</p>

      <DialogFooter>
        <div class="flex w-full justify-between">
          <Button variant="outline" onClick={props.back}>
            Back
          </Button>

          <Button variant="destructive" onClick={props.confirm}>
            Discard
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

export function SheetContainer(props: { children: JSXElement }) {
  const resolved = children(() => props.children);
  return (
    <div class="hide-scrollbars mt-4 grow overflow-x-hidden overflow-y-auto px-1">
      {resolved()}
    </div>
  );
}
