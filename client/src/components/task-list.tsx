import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Share2, List, Grid3X3, Calendar, User, Lightbulb, Repeat, X } from "lucide-react";
import { format } from "date-fns";
import TaskCard from "./task-card";
import BrainstormWhiteboard from "./brainstorm-whiteboard";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { ListWithTasks, InsertTask } from "@shared/schema";

interface TaskListProps {
  list?: ListWithTasks;
  onShare: () => void;
  onRefresh: () => void;
}

export default function TaskList({ list, onShare, onRefresh }: TaskListProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [selectedDueDate, setSelectedDueDate] = useState<Date>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRepeatOptions, setShowRepeatOptions] = useState(false);
  const [repeatType, setRepeatType] = useState<string>("none");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const { toast } = useToast();

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: InsertTask) => {
      await apiRequest("POST", "/api/tasks", taskData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      onRefresh();
      resetTaskForm();
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
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !list) return;

    const taskData: any = {
      title: newTaskTitle,
      listId: list.id,
      priority: "medium",
    };

    if (selectedDueDate) {
      taskData.dueDate = selectedDueDate.toISOString();
    }

    if (repeatType !== "none") {
      taskData.recurringType = repeatType;
      if (repeatType === "custom") {
        taskData.recurringDays = selectedDays;
      }
    }

    createTaskMutation.mutate(taskData as InsertTask);
  };

  const resetTaskForm = () => {
    setNewTaskTitle("");
    setSelectedDueDate(undefined);
    setShowDatePicker(false);
    setShowRepeatOptions(false);
    setRepeatType("none");
    setSelectedDays([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTask();
    }
  };

  if (!list) {
    return (
      <div className="flex-1 flex items-center justify-center bg-ms-bg">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-ms-text-secondary mb-2">
            No List Selected
          </h2>
          <p className="text-ms-text-secondary">
            Select a list from the sidebar to view tasks
          </p>
        </div>
      </div>
    );
  }

  // Show brainstorming whiteboard for brainstorming lists
  if (list.name.toLowerCase() === "brainstorming") {
    return <BrainstormWhiteboard listId={list.id} tasks={list.tasks || []} />;
  }

  // Filter and sort tasks
  let filteredTasks = [...list.tasks];

  if (filter === "pending") {
    filteredTasks = filteredTasks.filter(task => !task.isCompleted);
  } else if (filter === "completed") {
    filteredTasks = filteredTasks.filter(task => task.isCompleted);
  } else if (filter === "overdue") {
    const now = new Date();
    filteredTasks = filteredTasks.filter(
      task => task.dueDate && new Date(task.dueDate) < now && !task.isCompleted
    );
  }

  if (assigneeFilter === "me") {
    // Would need current user context
    // filteredTasks = filteredTasks.filter(task => task.assignedTo === currentUserId);
  } else if (assigneeFilter === "unassigned") {
    filteredTasks = filteredTasks.filter(task => !task.assignedTo);
  }

  // Sort tasks
  if (sortBy === "due_date") {
    filteredTasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  } else if (sortBy === "priority") {
    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    filteredTasks.sort((a, b) => priorityOrder[b.priority || 'medium'] - priorityOrder[a.priority || 'medium']);
  } else {
    filteredTasks.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-ms-surface border-b border-ms-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ms-text">{list.name}</h1>
            <p className="text-sm text-ms-text-secondary mt-1">
              {list.description || "Your tasks and priorities"} • {list.taskCount} tasks
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={onShare} className="bg-primary hover:bg-primary/90">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            
            <div className="flex bg-gray-100 rounded-md p-1">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-ms-surface border-b border-ms-border px-6 py-3">
        <div className="flex items-center space-x-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tasks</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Sort by created</SelectItem>
              <SelectItem value="due_date">Sort by due date</SelectItem>
              <SelectItem value="priority">Sort by priority</SelectItem>
              <SelectItem value="assignee">Sort by assignee</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              <SelectItem value="me">Assigned to me</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Add Task Input */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-4 shadow-sm">
            <Input
              type="text"
              placeholder="Add a task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-xl text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-none focus-visible:ring-0 p-0 bg-transparent touch-manipulation"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-4">
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 mr-1" />
                      {selectedDueDate ? format(selectedDueDate, "MMM d") : "Due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="start">
                    <div className="p-4 space-y-3">
                      {/* Add to My Day */}
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left mb-2"
                        onClick={() => {
                          // Add to My Day logic here
                          setShowDatePicker(false);
                          toast({
                            title: "Added to My Day",
                            description: "Task will appear in your My Day list",
                          });
                        }}
                      >
                        <div className="w-4 h-4 mr-3 flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                        Add to My Day
                      </Button>

                      {/* Due Today */}
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left"
                        onClick={() => {
                          const today = new Date();
                          setSelectedDueDate(today);
                          setShowDatePicker(false);
                        }}
                      >
                        <Calendar className="w-4 h-4 mr-3" />
                        Due Today
                      </Button>
                      
                      {/* Due Tomorrow */}
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left"
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setSelectedDueDate(tomorrow);
                          setShowDatePicker(false);
                        }}
                      >
                        <Calendar className="w-4 h-4 mr-3" />
                        Due Tomorrow
                      </Button>
                      
                      <div className="border-t pt-3">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDueDate}
                          onSelect={(date) => {
                            setSelectedDueDate(date);
                            setShowDatePicker(false);
                          }}
                          initialFocus
                        />
                      </div>
                      
                      {selectedDueDate && (
                        <div className="border-t pt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDueDate(undefined);
                              setShowDatePicker(false);
                            }}
                            className="w-full text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Remove due date
                          </Button>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover open={showRepeatOptions} onOpenChange={setShowRepeatOptions}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                      <Repeat className="w-4 h-4 mr-1" />
                      {repeatType !== "none" ? `${repeatType.charAt(0).toUpperCase() + repeatType.slice(1)}` : "Repeat"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2">
                      <div className="space-y-1">
                        <Button
                          variant="ghost"
                          className={`w-full justify-start text-left ${repeatType === "daily" ? "bg-blue-50 text-blue-600" : ""}`}
                          onClick={() => {
                            setRepeatType("daily");
                            setShowRepeatOptions(false);
                          }}
                        >
                          <div className="flex items-center">
                            <div className="w-4 h-4 mr-3 flex items-center justify-center">
                              <div className={`w-2 h-2 rounded-full ${repeatType === "daily" ? "bg-blue-600" : "bg-blue-500"}`}></div>
                            </div>
                            Daily
                          </div>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          className={`w-full justify-start text-left ${repeatType === "weekdays" ? "bg-blue-50 text-blue-600" : ""}`}
                          onClick={() => {
                            setRepeatType("weekdays");
                            setShowRepeatOptions(false);
                          }}
                        >
                          <div className="flex items-center">
                            <div className="w-4 h-4 mr-3 flex items-center justify-center">
                              <div className={`w-2 h-2 rounded-full ${repeatType === "weekdays" ? "bg-blue-600" : "bg-blue-500"}`}></div>
                            </div>
                            Weekdays
                          </div>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          className={`w-full justify-start text-left ${repeatType === "weekly" ? "bg-blue-50 text-blue-600" : ""}`}
                          onClick={() => {
                            setRepeatType("weekly");
                            setShowRepeatOptions(false);
                          }}
                        >
                          <div className="flex items-center">
                            <div className="w-4 h-4 mr-3 flex items-center justify-center">
                              <div className={`w-2 h-2 rounded-full ${repeatType === "weekly" ? "bg-blue-600" : "bg-blue-500"}`}></div>
                            </div>
                            Weekly
                          </div>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          className={`w-full justify-start text-left ${repeatType === "monthly" ? "bg-blue-50 text-blue-600" : ""}`}
                          onClick={() => {
                            setRepeatType("monthly");
                            setShowRepeatOptions(false);
                          }}
                        >
                          <div className="flex items-center">
                            <div className="w-4 h-4 mr-3 flex items-center justify-center">
                              <div className={`w-2 h-2 rounded-full ${repeatType === "monthly" ? "bg-blue-600" : "bg-blue-500"}`}></div>
                            </div>
                            Monthly
                          </div>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          className={`w-full justify-start text-left ${repeatType === "yearly" ? "bg-blue-50 text-blue-600" : ""}`}
                          onClick={() => {
                            setRepeatType("yearly");
                            setShowRepeatOptions(false);
                          }}
                        >
                          <div className="flex items-center">
                            <div className="w-4 h-4 mr-3 flex items-center justify-center">
                              <div className={`w-2 h-2 rounded-full ${repeatType === "yearly" ? "bg-blue-600" : "bg-blue-500"}`}></div>
                            </div>
                            Yearly
                          </div>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          className={`w-full justify-start text-left ${repeatType === "custom" ? "bg-blue-50 text-blue-600" : ""}`}
                          onClick={() => {
                            setRepeatType("custom");
                            setShowRepeatOptions(false);
                          }}
                        >
                          <div className="flex items-center">
                            <div className="w-4 h-4 mr-3 flex items-center justify-center">
                              <div className={`w-2 h-2 rounded-full ${repeatType === "custom" ? "bg-blue-600" : "bg-blue-500"}`}></div>
                            </div>
                            Custom
                          </div>
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4 mr-1" />
                  Assign
                </Button>
              </div>
              <Button 
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createTaskMutation.isPending ? "Adding..." : "Add Task"}
              </Button>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">No tasks found</p>
            </div>
          ) : (
            <>
              {/* Incomplete Tasks */}
              {filteredTasks
                .filter(task => !task.isCompleted)
                .map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={onRefresh} />
                ))}
              
              {/* Completed Tasks - Always at bottom */}
              {filteredTasks
                .filter(task => task.isCompleted)
                .map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={onRefresh} />
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}