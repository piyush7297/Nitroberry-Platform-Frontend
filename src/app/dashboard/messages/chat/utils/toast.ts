import { toast } from "@/hooks/use-toast";

const showToast = (
  title: string,
  description: string,
  variant: "default" | "destructive" | "warning" = "default",
) => {
  toast({
    title,
    description,
    variant,
  });
};

export const notify = {
  success: (msg: string) => showToast("Success", msg),
  error: (msg: string) => showToast("Error", msg, "destructive"),
  info: (msg: string) => showToast("Info", msg),
  warn: (msg: string) => showToast("Warning", msg, "warning"),
};
