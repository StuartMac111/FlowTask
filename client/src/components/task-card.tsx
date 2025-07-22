import { useState } from "react";
import React from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Plus, Edit3, MoreVertical, ChevronDown, ChevronRight, Save, X, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import PriorityDot from "./priority-dot";
import type { Task } from "@shared/schema";

interface TaskCardProps {
  task: Task;
  onUpdate: () => void;
}

export default function TaskCard({ task, onUpdate }: TaskCardProps) {
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || "");
  const [recurringType, setRecurringType] = useState<string>("none");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const { toast } = useToast();

  // Play completion sound
  const playCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Fallback: no sound if audio context fails
    }
  };

  // Toggle task completion mutation
  const toggleCompleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/tasks/${task.id}`, {
        isCompleted: !task.isCompleted,
      });
    },
    onSuccess: () => {
      if (!task.isCompleted) {
        playCompletionSound();
      }
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

  // Edit task mutation
  const editTaskMutation = useMutation({
    mutationFn: async (updates: { title?: string; description?: string; recurringType?: string; recurringDays?: string[] }) => {
      await apiRequest("PUT", `/api/tasks/${task.id}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      setIsEditing(false);
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

  // Priority mutation
  const priorityMutation = useMutation({
    mutationFn: async (newPriority: "low" | "medium" | "high") => {
      await apiRequest("PUT", `/api/tasks/${task.id}`, {
        priority: newPriority,
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
        description: "Failed to update priority",
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

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      editTaskMutation.mutate({
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        recurringType: recurringType !== "none" ? recurringType : undefined,
        recurringDays: recurringType === "custom" ? selectedDays : undefined,
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setRecurringType("none");
    setSelectedDays([]);
  };

  const handlePriorityChange = (newPriority: "low" | "medium" | "high") => {
    priorityMutation.mutate(newPriority);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleContextEdit = () => {
    setIsEditing(true);
    setShowContextMenu(false);
  };

  const handleContextDelete = () => {
    deleteTaskMutation.mutate();
    setShowContextMenu(false);
  };

  // Handle click away to exit editing
  React.useEffect(() => {
    const handleClickAway = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isEditing && !target.closest('.task-card')) {
        handleCancelEdit();
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickAway);
      return () => document.removeEventListener('mousedown', handleClickAway);
    }
  }, [isEditing]);

  return (
    <div 
      data-task-id={task.id}
      className={`task-card bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-4 shadow-sm cursor-pointer transition-all duration-300 ${
        task.isCompleted ? 'completed-task opacity-75' : ''
      }`}
      onContextMenu={handleRightClick}
      onClick={(e) => {
        e.stopPropagation();
        const target = e.target as HTMLElement;
        // Only edit if NOT clicking on interactive elements (checkbox, buttons, dropdowns)
        if (!target.closest('button, input, select, [role="button"], [data-radix-popper-content-wrapper]') &&
            !target.hasAttribute('role') && 
            !target.closest('[role="button"], [role="menuitem"], [role="option"]')) {
          setIsEditing(true);
        }
      }}
    >
      <div className="flex items-start space-x-3">
        <Checkbox
          checked={task.isCompleted}
          onCheckedChange={() => {
            if (!task.isCompleted) {
              playCompletionSound();
              // Add completion animation
              const taskCard = document.querySelector(`[data-task-id="${task.id}"]`);
              if (taskCard) {
                taskCard.classList.add('animate-pulse');
                setTimeout(() => {
                  taskCard.classList.remove('animate-pulse');
                }, 500);
              }
            }
            toggleCompleteMutation.mutate();
          }}
          className="mt-1 w-6 h-6 scale-150"
          disabled={toggleCompleteMutation.isPending}
          onClick={(e) => e.stopPropagation()}
        />
        
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-black dark:text-white bg-white dark:bg-gray-700"
                placeholder="Task title..."
              />
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="text-black dark:text-white bg-white dark:bg-gray-700"
                placeholder="📝 Note (optional)..."
                rows={2}
              />
              
              {/* Recurring Options */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Repeat:
                </label>
                <Select value={recurringType} onValueChange={setRecurringType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select repeat option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Don't repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom days</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Custom Days Selection */}
                {recurringType === "custom" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select days:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                        <Button
                          key={day}
                          type="button"
                          size="sm"
                          variant={selectedDays.includes(day) ? "default" : "outline"}
                          onClick={() => {
                            setSelectedDays(prev => 
                              prev.includes(day) 
                                ? prev.filter(d => d !== day)
                                : [...prev, day]
                            );
                          }}
                          className="text-xs"
                        >
                          {day.slice(0, 3)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={editTaskMutation.isPending || !editTitle.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {editTaskMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={editTaskMutation.isPending}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className={`task-title font-medium text-black dark:text-white ${
                  task.isCompleted ? 'line-through opacity-60' : ''
                }`} style={{ fontSize: '1.5rem' }}>
                  {task.title}
                </h3>
                <div className="flex items-center space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <PriorityDot 
                          priority={(task.priority as "low" | "medium" | "high") || 'medium'} 
                          size="lg"
                          className="hover:scale-110 transition-transform"
                        />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handlePriorityChange('low');
                      }}>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span>Green (Not Important)</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handlePriorityChange('medium');
                      }}>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span>Yellow (Important)</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handlePriorityChange('high');
                      }}>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span>Red (Very Important)</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {task.description && (
                <p className={`text-lg text-gray-600 dark:text-gray-400 mt-1 ${
                  task.isCompleted ? 'line-through opacity-60' : ''
                }`} style={{ fontSize: '1.2rem' }}>
                  {task.description}
                </p>
              )}
            </>
          )}
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-4">
              {task.dueDate && (
                <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
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
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Assigned
                  </span>
                </div>
              )}
            </div>
            
            {!isEditing && (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right-click Context Menu */}
      {showContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowContextMenu(false)}
          />
          <div 
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg py-1"
            style={{
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
            }}
          >
            <button
              onClick={handleContextEdit}
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Edit Task
            </button>
            <button
              onClick={handleContextDelete}
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Task
            </button>
          </div>
        </>
      )}
    </div>
  );
}