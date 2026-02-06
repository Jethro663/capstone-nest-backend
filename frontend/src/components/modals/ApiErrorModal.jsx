import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const ApiErrorModal = ({ isOpen, error, onClose }) => {
  if (!isOpen || !error) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
        <Button
          variant="ghost"
          className="absolute top-2 right-2"
          onClick={onClose}
        >
          <X />
        </Button>

        <h2 className="text-xl font-bold text-red-600">
          {error.title || "API Error"}
        </h2>

        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p><strong>Message:</strong> {error.message}</p>
          <p><strong>Source:</strong> {error.source}</p>

          {error.field && (
            <p><strong>Field:</strong> {error.field}</p>
          )}

          {error.code && (
            <p><strong>Status Code:</strong> {error.code}</p>
          )}

          {error.requestId && (
            <p className="text-xs text-gray-500">
              Request ID: {error.requestId}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="destructive" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApiErrorModal;
