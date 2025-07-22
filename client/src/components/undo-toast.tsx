import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Undo2 } from "lucide-react";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  duration?: number;
}

export function showUndoToast({ message, onUndo, duration = 5000 }: UndoToastProps) {
  const { toast } = useToast();
  
  return toast({
    title: message,
    duration: duration,
    action: (
      <Button
        variant="outline"
        size="sm"
        onClick={onUndo}
        className="gap-2"
      >
        <Undo2 className="h-4 w-4" />
        Undo
      </Button>
    ),
  });
}

// Helper function for task deletion with undo
export function showTaskDeletedToast(taskTitle: string, onUndo: () => void) {
  return showUndoToast({
    message: `"${taskTitle}" deleted`,
    onUndo,
    duration: 7000, // Longer duration for task deletions
  });
}