import { toast } from "sonner";

export function showError(message: string) {
  toast.error(message, { duration: 5000 });
}

export function showSuccess(message: string) {
  toast.success(message, { duration: 3000 });
}

export function showLoading(message: string) {
  return toast.loading(message);
}

export function dismissToast(id: string | number) {
  toast.dismiss(id);
}
