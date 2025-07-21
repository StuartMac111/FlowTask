import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Plus, Edit3, MoreVertical, ChevronDown, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Task } from "@shared/schema";

interface TaskCardProps {
  task: Task;
  onUpdate: () => void;
}

export default function TaskCard({ task, onUpdate }: TaskCardProps) {
  const [showSubtasks, setShowSubtasks] = useState(false);
  const { toast } = useToast();

  // Toggle task completion mutation
  const toggleCompleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/tasks/${task.id}`, {
        isCompleted: !task.isCompleted,
      });
    },
    onSuccess: () => {
      onUpdate();
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
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/tasks/${task.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      onUpdate();
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
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const formatDate = (date: string | null) => {
    if (!date) return "";
    const d = new Date(date);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const isTomorrow = d.toDateString() === new Date(today.getTime() + 86400000).toDateString();
    
    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";
    return d.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "priority-high";
      case "medium":
        return "priority-medium";
      case "low":
        return "priority-low";
      default:
        return "priority-medium";
    }
  };

  return (
    <div className={`task-card bg-white rounded-lg border border-ms-border p-4 shadow-sm ${
      task.isCompleted ? 'completed-task' : ''
    }`}>
      <div className="flex items-start space-x-3">
        <Checkbox
          checked={task.isCompleted}
          onCheckedChange={() => toggleCompleteMutation.mutate()}
          className="mt-1"
          disabled={toggleCompleteMutation.isPending}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`task-title font-medium text-ms-text ${
              task.isCompleted ? 'line-through' : ''
            }`}>
              {task.title}
            </h3>
            <div className="flex items-center space-x-2">
              <Badge className={getPriorityColor(task.priority || 'medium')}>
                {task.priority || 'medium'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteTaskMutation.mutate()}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {task.description && (
            <p className="text-sm text-ms-text-secondary mt-1">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-4">
              {task.dueDate && (
                <div className="flex items-center space-x-1 text-sm text-ms-text-secondary">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(task.dueDate)}</span>
                </div>
              )}
              
              {task.assignedTo && (
                <div className="flex items-center space-x-1">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">
                      U
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-ms-text-secondary">
                    Assigned
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}