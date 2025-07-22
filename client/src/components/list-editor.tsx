import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { ListWithTasks } from "@shared/schema";

interface ListEditorProps {
  list: ListWithTasks;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const BACKGROUND_COLORS = [
  "#0078D4", // Microsoft Blue
  "#107C10", // Green
  "#FF4B4B", // Red
  "#FF8C00", // Orange
  "#5856D6", // Purple
  "#007ACC", // Dark Blue
  "#34C759", // Light Green
  "#FF2D92", // Pink
  "#AF52DE", // Light Purple
  "#FF9500", // Amber
  "#8E8E93", // Gray
  "#000000", // Black
];

export default function ListEditor({ list, isOpen, onClose, onRefresh }: ListEditorProps) {
  const [name, setName] = useState(list.name);
  const [selectedColor, setSelectedColor] = useState(list.color || "#0078D4");
  const { toast } = useToast();

  // Update list mutation
  const updateListMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      await apiRequest("PUT", `/api/lists/${list.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "List Updated",
        description: "List has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      onRefresh();
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update list",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "List name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateListMutation.mutate({
      name: name.trim(),
      color: selectedColor,
    });
  };

  const handleClose = () => {
    setName(list.name);
    setSelectedColor(list.color || "#0078D4");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit List</DialogTitle>
          <DialogDescription>
            Change the name and background color of your list.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="List name"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Color
            </Label>
            <div className="col-span-3">
              <div className="grid grid-cols-6 gap-2">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      selectedColor === color
                        ? "border-gray-800 dark:border-gray-200"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateListMutation.isPending}
          >
            {updateListMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}