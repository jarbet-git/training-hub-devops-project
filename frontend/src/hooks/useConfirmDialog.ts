import { useCallback, useRef, useState } from "react";

export type ConfirmRequest = {
  title: string;
  description?: string;
  confirmText: string;
  cancelText: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

/**
 * Small helper hook to replace window.confirm() with a friendly modal.
 * It stores the pending action in a ref so we don't re-render with a new callback identity.
 */
export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string | undefined>(undefined);
  const [confirmText, setConfirmText] = useState("");
  const [cancelText, setCancelText] = useState("");
  const [destructive, setDestructive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const actionRef = useRef<ConfirmRequest["onConfirm"] | null>(null);

  const request = useCallback((req: ConfirmRequest) => {
    setTitle(req.title);
    setDescription(req.description);
    setConfirmText(req.confirmText);
    setCancelText(req.cancelText);
    setDestructive(req.destructive ?? true);
    actionRef.current = req.onConfirm;
    setOpen(true);
  }, []);

  const confirm = useCallback(async () => {
    const fn = actionRef.current;
    if (!fn) return;
    setIsLoading(true);
    try {
      await fn();
      setOpen(false);
      actionRef.current = null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancel = useCallback(() => {
    if (isLoading) return;
    setOpen(false);
    actionRef.current = null;
  }, [isLoading]);

  return {
    open,
    setOpen,
    title,
    description,
    confirmText,
    cancelText,
    destructive,
    isLoading,
    request,
    confirm,
    cancel,
  };
}
