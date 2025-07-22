import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus, Move3D, Lightbulb, Calendar, AlertCircle, CheckCircle, Clock, Palette, Download, Link, Square, Circle, Triangle, Type, Bold, Italic, Underline, Minus, HelpCircle, CalendarDays, Edit, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { InsertTask, Task } from "@shared/schema";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface StickyNote {
  id: string;
  content: string;
  x: number;
  y: number;
  color: string;
  priority?: "low" | "medium" | "high";
  createdAt?: Date;
  dueDate?: Date;
  description?: string;
  shape?: "square" | "circle" | "triangle";
  textStyle?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontSize?: number;
  };
  groupId?: string;
  connections?: string[];
  isCompleted?: boolean;
  isCrumpling?: boolean;
  repeatType?: "none" | "daily" | "weekly" | "monthly" | "yearly";
  repeatDays?: string[];
}

interface DrawingLine {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  thickness: number;
}

interface ConnectionLine {
  id: string;
  fromNoteId: string;
  toNoteId: string;
  color: string;
  label?: string;
}

interface BrainstormWhiteboardProps {
  listId: string;
  tasks: Task[];
}

const NOTE_COLORS = [
  "#FFF740", // Yellow
  "#FFB3BA", // Pink
  "#BAFFC9", // Green  
  "#BAE1FF", // Blue
  "#FFFFBA", // Light Yellow
  "#FFD700", // Gold
  "#98FB98", // Pale Green
  "#DDA0DD", // Plum
];

export default function BrainstormWhiteboard({ listId, tasks }: BrainstormWhiteboardProps) {
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [newIdeaText, setNewIdeaText] = useState("");
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [drawingLines, setDrawingLines] = useState<DrawingLine[]>([]);
  const [connectionLines, setConnectionLines] = useState<ConnectionLine[]>([]);
  const [selectedTool, setSelectedTool] = useState<"move" | "draw" | "connect" | "text">("move");
  const [selectedShape, setSelectedShape] = useState<"square" | "circle" | "triangle">("square");
  const [selectedColor, setSelectedColor] = useState("#FFF740");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<DrawingLine | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [whiteboardTransform, setWhiteboardTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showFontSizer, setShowFontSizer] = useState<string | null>(null);
  const [showRepeatMenu, setShowRepeatMenu] = useState<string | null>(null);
  const [selectedRepeatType, setSelectedRepeatType] = useState<string>("none");
  const whiteboardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Convert tasks to sticky notes on load
  useEffect(() => {
    const notes: StickyNote[] = tasks.map((task, index) => ({
      id: task.id,
      content: task.title,
      x: 50 + (index % 6) * 180,
      y: 80 + Math.floor(index / 6) * 140,
      color: NOTE_COLORS[index % NOTE_COLORS.length],
      priority: task.priority || undefined,
      createdAt: task.createdAt || undefined,
      dueDate: task.dueDate || undefined,
      description: task.description || "",
      shape: "square",
      textStyle: { bold: false, italic: false, underline: false, fontSize: 14 },
      connections: [],
      isCompleted: task.isCompleted || false,
      isCrumpling: false,
    }));
    setStickyNotes(notes);
  }, [tasks]);

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: InsertTask) => {
      await apiRequest("POST", "/api/tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({
        title: "Idea Added",
        description: "Your brainstorming idea has been saved!",
      });
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
        description: "Failed to add idea",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
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
        description: "Failed to delete idea",
        variant: "destructive",
      });
    },
  });

  const updateTaskByIdMutation = useMutation({
    mutationFn: async (taskData: { id: string; priority?: 'low' | 'medium' | 'high'; title?: string }) => {
      const updateData: any = {};
      if (taskData.priority) updateData.priority = taskData.priority;
      if (taskData.title) updateData.title = taskData.title;
      await apiRequest("PATCH", `/api/tasks/${taskData.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({
        title: "Priority Updated",
        description: "Task priority has been updated!",
      });
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

  const addNewIdea = () => {
    if (!newIdeaText.trim()) return;

    // Find a good position for the new note in smaller whiteboard
    const newX = 50 + (stickyNotes.length % 6) * 180;
    const newY = 80 + Math.floor(stickyNotes.length / 6) * 140;
    const newColor = NOTE_COLORS[stickyNotes.length % NOTE_COLORS.length];

    createTaskMutation.mutate({
      title: newIdeaText.trim(),
      listId,
      isCompleted: false,
      priority: "medium",
    } as InsertTask);

    setNewIdeaText("");
  };

  const removeIdea = (noteId: string) => {
    deleteTaskMutation.mutate(noteId);
    setStickyNotes(prev => prev.filter(note => note.id !== noteId));
  };

  const handleMouseDown = (e: React.MouseEvent, noteId: string) => {
    // Only start dragging on left click (button 0)
    if (e.button !== 0) return;
    
    e.stopPropagation();
    const note = stickyNotes.find(n => n.id === noteId);
    if (!note) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDraggedNote(noteId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNote || !whiteboardRef.current) return;

    const whiteboardRect = whiteboardRef.current.getBoundingClientRect();
    const newX = e.clientX - whiteboardRect.left - dragOffset.x;
    const newY = e.clientY - whiteboardRect.top - dragOffset.y;

    setStickyNotes(prev => prev.map(note => 
      note.id === draggedNote 
        ? { ...note, x: Math.max(0, newX), y: Math.max(0, newY) }
        : note
    ));
  };

  const handleMouseUp = () => {
    setDraggedNote(null);
    finishDrawing();
  };

  // Advanced drawing functionality
  const startDrawing = (e: React.MouseEvent) => {
    if (selectedTool !== "draw" || !whiteboardRef.current) return;
    
    const rect = whiteboardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newLine: DrawingLine = {
      id: `line-${Date.now()}`,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      color: selectedColor,
      thickness: 2,
    };
    
    setCurrentLine(newLine);
    setIsDrawing(true);
  };

  const continueDrawing = (e: React.MouseEvent) => {
    if (!isDrawing || !currentLine || !whiteboardRef.current) return;
    
    const rect = whiteboardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentLine({ ...currentLine, endX: x, endY: y });
  };

  const finishDrawing = () => {
    if (currentLine && isDrawing) {
      setDrawingLines(prev => [...prev, currentLine]);
    }
    setCurrentLine(null);
    setIsDrawing(false);
  };

  // Connection functionality
  const handleNoteClick = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (selectedTool === "connect") {
      if (!connectingFrom) {
        setConnectingFrom(noteId);
        toast({ title: "Connection Mode", description: "Click another note to connect" });
      } else if (connectingFrom !== noteId) {
        const newConnection: ConnectionLine = {
          id: `conn-${Date.now()}`,
          fromNoteId: connectingFrom,
          toNoteId: noteId,
          color: selectedColor,
          label: "related to",
        };
        setConnectionLines(prev => [...prev, newConnection]);
        setConnectingFrom(null);
        toast({ title: "Notes Connected!", description: "Connection created successfully" });
      }
    }
  };

  const handleNoteRightClick = (noteId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Right click detected on note:', noteId, 'Setting context menu at:', e.clientX, e.clientY); // Debug log
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      noteId
    });
  };

  const startEditingNote = (noteId: string) => {
    const note = stickyNotes.find(n => n.id === noteId);
    if (note) {
      setEditingNote(noteId);
      setEditText(note.content);
    }
    setContextMenu(null);
  };

  const saveEditedNote = (noteId: string) => {
    if (editText.trim()) {
      setStickyNotes(prev => prev.map(note => 
        note.id === noteId ? { ...note, content: editText.trim() } : note
      ));
      
      // Update in database
      updateTaskByIdMutation.mutate({
        id: noteId,
        title: editText.trim()
      });
    }
    setEditingNote(null);
    setEditText("");
  };

  const cancelEditing = () => {
    setEditingNote(null);
    setEditText("");
  };

  // Export functionality
  const exportWhiteboard = () => {
    const data = {
      notes: stickyNotes,
      drawings: drawingLines,
      connections: connectionLines,
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brainstorm-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Exported!", description: "Whiteboard saved successfully" });
  };

  // Note shape and formatting functions
  const updateNoteShape = (noteId: string, shape: "square" | "circle" | "triangle") => {
    setStickyNotes(prev => prev.map(note => 
      note.id === noteId ? { ...note, shape } : note
    ));
  };

  const updateNoteStyle = (noteId: string, style: Partial<StickyNote['textStyle']>) => {
    setStickyNotes(prev => prev.map(note => 
      note.id === noteId ? { 
        ...note, 
        textStyle: { ...note.textStyle, ...style } 
      } : note
    ));
  };

  const updateNotePriority = (noteId: string, priority: 'low' | 'medium' | 'high') => {
    setStickyNotes(prev => prev.map(note => 
      note.id === noteId ? { ...note, priority } : note
    ));
    
    // Update task priority in database
    updateTaskByIdMutation.mutate({
      id: noteId,
      priority
    });
  };

  const updateNoteDueDate = (noteId: string, dueDate: Date | null) => {
    setStickyNotes(prev => prev.map(note => 
      note.id === noteId ? { ...note, dueDate: dueDate || undefined } : note
    ));
    
    // Update task due date in database using a separate API call
    apiRequest("PATCH", `/api/tasks/${noteId}`, {
      dueDate: dueDate?.toISOString() || null
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({
        title: "Due Date Updated",
        description: dueDate ? `Due date set to ${dueDate.toLocaleDateString()}` : "Due date removed",
      });
    }).catch((error) => {
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
        description: "Failed to update due date",
        variant: "destructive",
      });
    });
  };

  const openDatePicker = (noteId: string) => {
    const note = stickyNotes.find(n => n.id === noteId);
    setSelectedDate(note?.dueDate);
    setShowDatePicker(noteId);
  }

  const openRepeatMenu = (noteId: string) => {
    setShowRepeatMenu(noteId);
    const note = stickyNotes.find(n => n.id === noteId);
    setSelectedRepeatType(note?.repeatType || "none");
  };

  const handleRepeatOptionClick = (option: string) => {
    const confirmOptions = {
      "daily": "This note will repeat every day. Continue?",
      "weekly": "This note will repeat every week. Continue?", 
      "monthly": "This note will repeat every month. Continue?",
      "yearly": "This note will repeat every year. Continue?",
      "none": "Remove repeat for this note?"
    };

    if (confirm(confirmOptions[option as keyof typeof confirmOptions])) {
      // Update the note with repeat information
      setStickyNotes(prev => prev.map(note => 
        note.id === showRepeatMenu ? { ...note, repeatType: option } : note
      ));
      
      toast({
        title: "Repeat Updated",
        description: `Note will ${option === "none" ? "not repeat" : `repeat ${option}`}`,
      });
    }
    
    setShowRepeatMenu(null);
    setSelectedRepeatType("none");
  };;

  const updateNoteFontSize = (noteId: string, fontSize: number) => {
    setStickyNotes(prev => prev.map(note => 
      note.id === noteId ? { 
        ...note, 
        textStyle: { ...note.textStyle, fontSize } 
      } : note
    ));
  };

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

  // Toggle note completion with crumple animation
  const toggleNoteCompletion = (noteId: string) => {
    const note = stickyNotes.find(n => n.id === noteId);
    if (!note) return;

    if (!note.isCompleted) {
      // Starting completion - trigger crumple animation
      setStickyNotes(prev => prev.map(n => 
        n.id === noteId ? { ...n, isCrumpling: true } : n
      ));
      
      playCompletionSound();
      
      // After animation, mark as completed and remove from view
      setTimeout(() => {
        setStickyNotes(prev => prev.filter(n => n.id !== noteId));
        
        // Update task in database
        apiRequest("PUT", `/api/tasks/${noteId}`, {
          isCompleted: true,
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
          toast({
            title: "Idea Completed!",
            description: "Sticky note has been marked as done",
          });
        }).catch((error) => {
          console.error("Failed to update task completion:", error);
          // Revert UI changes on error
          setStickyNotes(prev => [...prev, { ...note, isCompleted: false, isCrumpling: false }]);
        });
      }, 800); // Match animation duration
    }
  };

  // Enhanced whiteboard navigation
  const handleWhiteboardPanStart = (e: React.MouseEvent) => {
    if (e.button === 1 || (selectedTool === "move" && e.button === 0)) { // Middle mouse button or left click in move mode
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - whiteboardTransform.x, y: e.clientY - whiteboardTransform.y });
    }
  };

  const handleWhiteboardPan = (e: React.MouseEvent) => {
    if (isPanning) {
      setWhiteboardTransform(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    }
  };

  const handleWhiteboardPanEnd = () => {
    setIsPanning(false);
  };

  const handleZoom = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(whiteboardTransform.scale * zoomFactor, 0.3), 3);
    
    setWhiteboardTransform(prev => ({
      ...prev,
      scale: newScale,
    }));
  };

  const resetWhiteboardView = () => {
    setWhiteboardTransform({ x: 0, y: 0, scale: 0.8 });
  };

  const fitWhiteboardToContent = () => {
    if (stickyNotes.length === 0) return;
    
    const padding = 100;
    const minX = Math.min(...stickyNotes.map(note => note.x)) - padding;
    const minY = Math.min(...stickyNotes.map(note => note.y)) - padding;
    const maxX = Math.max(...stickyNotes.map(note => note.x + 140)) + padding;
    const maxY = Math.max(...stickyNotes.map(note => note.y + 100)) + padding;
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      const scaleX = containerWidth / contentWidth;
      const scaleY = containerHeight / contentHeight;
      const scale = Math.min(scaleX, scaleY, 1);
      
      setWhiteboardTransform({
        x: -minX * scale + (containerWidth - contentWidth * scale) / 2,
        y: -minY * scale + (containerHeight - contentHeight * scale) / 2,
        scale: scale,
      });
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white dark:bg-gray-900">
        <Lightbulb className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-semibold">Brainstorming Whiteboard</h2>
      </div>

      {/* Advanced Toolbar */}
      <div className="p-4 border-b bg-gray-50 dark:bg-gray-800 space-y-4">
        {/* Tool Selection */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedTool === "move" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool("move")}
          >
            <Move3D className="w-4 h-4 mr-1" />
            Move
          </Button>
          <Button
            variant={selectedTool === "draw" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool("draw")}
          >
            <Minus className="w-4 h-4 mr-1" />
            Draw
          </Button>
          <Button
            variant={selectedTool === "connect" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool("connect")}
          >
            <Link className="w-4 h-4 mr-1" />
            Connect
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportWhiteboard}
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetWhiteboardView}
          >
            Reset View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fitWhiteboardToContent}
          >
            Fit to Content
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelp(!showHelp)}
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            Help
          </Button>
        </div>

        {/* Shape and Color Selection */}
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-1">
            <Button
              variant={selectedShape === "square" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedShape("square")}
            >
              <Square className="w-4 h-4" />
            </Button>
            <Button
              variant={selectedShape === "circle" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedShape("circle")}
            >
              <Circle className="w-4 h-4" />
            </Button>
            <Button
              variant={selectedShape === "triangle" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedShape("triangle")}
            >
              <Triangle className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-1">
            {NOTE_COLORS.slice(0, 6).map(color => (
              <button
                key={color}
                className={`w-6 h-6 rounded border-2 ${selectedColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>

        {/* Add New Idea Input */}
        <div className="flex gap-2 max-w-md">
          <Input
            value={newIdeaText}
            onChange={(e) => setNewIdeaText(e.target.value)}
            placeholder="Type your new idea..."
            onKeyPress={(e) => e.key === "Enter" && addNewIdea()}
            className="flex-1"
          />
          <Button 
            onClick={addNewIdea}
            disabled={!newIdeaText.trim() || createTaskMutation.isPending}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Idea
          </Button>
        </div>
      </div>

      {/* Enhanced Whiteboard Canvas with Massive Frame */}
      <div className="flex-1 p-0 bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 relative">
        {/* Zoom indicator */}
        <div className="absolute top-4 right-4 z-20 bg-black/20 text-white px-3 py-1 rounded-full text-sm font-mono">
          {Math.round(whiteboardTransform.scale * 100)}%
        </div>
        
        {/* Navigation instructions */}
        <div className="absolute bottom-4 left-4 z-20 bg-black/60 text-white px-3 py-1 rounded-lg text-xs font-medium">
          Move Tool: Left-click drag to pan • Scroll wheel to zoom • Starts at 80% size
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="absolute top-4 left-4 z-30 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-md border">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg">Brainstorming Help</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHelp(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium mb-1">Tools:</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                  <li>• <strong>Move:</strong> Left-click drag to pan canvas</li>
                  <li>• <strong>Draw:</strong> Sketch lines and arrows</li>
                  <li>• <strong>Connect:</strong> Link notes together</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Priority Colors:</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                  <li>• <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span><strong>Green:</strong> Low priority (not important)</li>
                  <li>• <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span><strong>Yellow:</strong> Medium priority (somewhat important)</li>
                  <li>• <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span><strong>Red:</strong> High priority (very important)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Navigation:</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                  <li>• Scroll wheel to zoom in/out</li>
                  <li>• Hover over notes to see formatting controls</li>
                  <li>• Click priority dots to set importance</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Maximum Width Whiteboard Frame - Edge to Edge with Enhanced Details */}
        <div 
          ref={containerRef}
          className={`w-full h-full relative bg-white dark:bg-gray-50 overflow-hidden ${
            selectedTool === "move" ? "cursor-grab active:cursor-grabbing" : "cursor-default"
          }`}
          style={{
            border: '15px solid #8B4513',
            borderRadius: '8px',
            maxWidth: '95%',
            maxHeight: '85%',
            margin: '2% auto',
            boxShadow: `
              inset 0 0 0 8px #A0522D,
              inset 0 0 0 12px #CD853F,
              inset 0 0 0 16px #DEB887,
              0 15px 30px rgba(0,0,0,0.4),
              0 8px 16px rgba(0,0,0,0.3)
            `,
            backgroundImage: `
              radial-gradient(circle at 20% 80%, rgba(139, 69, 19, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(160, 82, 45, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(205, 133, 63, 0.05) 0%, transparent 50%)
            `
          }}
          onMouseDown={handleWhiteboardPanStart}
          onMouseMove={handleWhiteboardPan}
          onMouseUp={handleWhiteboardPanEnd}
          onMouseLeave={handleWhiteboardPanEnd}
          onWheel={handleZoom}
        >
          <div 
            ref={whiteboardRef}
            className="w-full h-full relative overflow-hidden"
            style={{
              transform: `translate(${whiteboardTransform.x}px, ${whiteboardTransform.y}px) scale(${whiteboardTransform.scale})`,
              transformOrigin: '0 0',
              width: '100%',
              height: '100%',
              maxWidth: '1200px',
              maxHeight: '800px',
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px),
                radial-gradient(circle at 50px 50px, rgba(0,0,0,0.02) 2px, transparent 2px),
                linear-gradient(45deg, rgba(0,0,0,0.01) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(0,0,0,0.01) 25%, transparent 25%)
              `,
              backgroundSize: '20px 20px, 20px 20px, 100px 100px, 40px 40px, 40px 40px',
              backgroundPosition: '0 0, 0 0, 0 0, 0 0, 20px 20px'
            }}
            onMouseMove={(e) => {
              if (selectedTool === "draw") {
                continueDrawing(e);
              } else if (selectedTool === "move" && !draggedNote) {
                handleWhiteboardPan(e);
              } else {
                handleMouseMove(e);
              }
            }}
            onMouseUp={() => {
              handleMouseUp();
              handleWhiteboardPanEnd();
            }}
            onMouseDown={(e) => {
              // Only close context menu if left-clicking (not right-clicking)
              if (e.button === 0) {
                setContextMenu(null);
                setShowFontSizer(null);
              }
              
              if (selectedTool === "draw") {
                startDrawing(e);
              } else if (selectedTool === "move" && !draggedNote) {
                handleWhiteboardPanStart(e);
              }
            }}
            onMouseLeave={() => {
              handleMouseUp();
              handleWhiteboardPanEnd();
            }}
            // Touch event handlers for mobile support
            onTouchStart={(e) => {
              if (e.touches.length === 1) {
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                  clientX: touch.clientX,
                  clientY: touch.clientY,
                  button: 0
                });
                setContextMenu(null);
                setShowFontSizer(null);
                
                if (selectedTool === "draw") {
                  startDrawing(mouseEvent as any);
                } else if (selectedTool === "move" && !draggedNote) {
                  handleWhiteboardPanStart(mouseEvent as any);
                }
              }
            }}
            onTouchMove={(e) => {
              e.preventDefault(); // Prevent scrolling
              if (e.touches.length === 1) {
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                  clientX: touch.clientX,
                  clientY: touch.clientY
                });
                if (selectedTool === "draw") {
                  continueDrawing(mouseEvent as any);
                } else if (selectedTool === "move" && !draggedNote) {
                  handleWhiteboardPan(mouseEvent as any);
                } else {
                  handleMouseMove(mouseEvent as any);
                }
              }
            }}
            onTouchEnd={() => {
              handleMouseUp();
              handleWhiteboardPanEnd();
            }}
          >
            {/* Drawing Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
              {/* Existing drawing lines */}
              {drawingLines.map((line) => (
                <line
                  key={line.id}
                  x1={line.startX}
                  y1={line.startY}
                  x2={line.endX}
                  y2={line.endY}
                  stroke={line.color}
                  strokeWidth={line.thickness}
                  strokeLinecap="round"
                />
              ))}
              
              {/* Current drawing line */}
              {currentLine && (
                <line
                  x1={currentLine.startX}
                  y1={currentLine.startY}
                  x2={currentLine.endX}
                  y2={currentLine.endY}
                  stroke={currentLine.color}
                  strokeWidth={currentLine.thickness}
                  strokeLinecap="round"
                />
              )}
              
              {/* Connection lines between notes */}
              {connectionLines.map((connection) => {
                const fromNote = stickyNotes.find(n => n.id === connection.fromNoteId);
                const toNote = stickyNotes.find(n => n.id === connection.toNoteId);
                if (!fromNote || !toNote) return null;
                
                return (
                  <g key={connection.id}>
                    <line
                      x1={fromNote.x + 70}
                      y1={fromNote.y + 50}
                      x2={toNote.x + 70}
                      y2={toNote.y + 50}
                      stroke={connection.color}
                      strokeWidth={3}
                      strokeDasharray="5,5"
                      markerEnd="url(#arrowhead)"
                    />
                    {connection.label && (
                      <text
                        x={(fromNote.x + toNote.x) / 2 + 70}
                        y={(fromNote.y + toNote.y) / 2 + 45}
                        fill={connection.color}
                        fontSize="12"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {connection.label}
                      </text>
                    )}
                  </g>
                );
              })}
              
              {/* Arrow marker definition */}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={selectedColor} />
                </marker>
              </defs>
            </svg>

            {/* Sticky Notes with Enhanced Features */}
            {stickyNotes.map((note, index) => (
              <div
                key={note.id}
                className="absolute cursor-move select-none"
                style={{
                  left: note.x,
                  top: note.y,
                  width: '140px',
                  minHeight: '100px',
                  transform: `rotate(${(index % 7) - 3}deg)`,
                  zIndex: draggedNote === note.id ? 50 : 10,
                }}
                onMouseDown={(e) => handleMouseDown(e, note.id)}
                onClick={(e) => {
                  // Only handle click for connect tool
                  if (selectedTool === "connect") {
                    handleNoteClick(note.id, e);
                  }
                }}
                onContextMenu={(e) => handleNoteRightClick(note.id, e)}
              >
                {/* Ultra Realistic 3D Push Pin */}
                <div 
                  className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20"
                  style={{ pointerEvents: 'none' }}
                >
                  {/* Pin Head with 3D gradient effect */}
                  <div className="w-6 h-6 rounded-full relative"
                       style={{
                         background: `radial-gradient(circle at 30% 30%, 
                           #ff6b6b 0%, 
                           #e74c3c 30%, 
                           #c0392b 60%, 
                           #a93226 100%)`,
                         boxShadow: `
                           0 2px 4px rgba(0,0,0,0.3),
                           inset 0 1px 0 rgba(255,255,255,0.4),
                           inset 0 -1px 0 rgba(0,0,0,0.2)
                         `
                       }}>
                    {/* Pin shaft with metallic effect */}
                    <div className="absolute top-5 left-1/2 transform -translate-x-1/2 w-1 h-8 rounded-full"
                         style={{
                           background: `linear-gradient(90deg, 
                             #95a5a6 0%, 
                             #bdc3c7 30%, 
                             #ecf0f1 50%, 
                             #bdc3c7 70%, 
                             #7f8c8d 100%)`,
                           boxShadow: '0 0 3px rgba(0,0,0,0.2)'
                         }}></div>
                    {/* Pin tip */}
                    <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-0.5 h-1 bg-gray-600 rounded-b-full"></div>
                    {/* Glossy highlight on pin head */}
                    <div className="absolute top-1 left-1.5 w-2 h-2 bg-white rounded-full opacity-40"></div>
                    {/* Smaller highlight */}
                    <div className="absolute top-0.5 left-1 w-1 h-1 bg-white rounded-full opacity-60"></div>
                  </div>
                </div>
                
                {/* Enhanced Detailed Sticky Note */}
                <Card
                  className={`w-full h-full shadow-lg border-2 transition-all duration-200 ${
                    draggedNote === note.id ? 'scale-105 shadow-xl' : 'hover:scale-105'
                  } ${
                    connectingFrom === note.id ? 'ring-4 ring-blue-400' : ''
                  } ${
                    note.shape === 'circle' ? 'rounded-full' : 
                    note.shape === 'triangle' ? 'clip-triangle' : 'rounded-lg'
                  } ${
                    note.isCrumpling ? 'animate-crumple' : ''
                  }`}
                  style={{
                    backgroundColor: note.color,
                    borderColor: draggedNote === note.id ? '#6366f1' : 
                                connectingFrom === note.id ? '#3b82f6' : 'rgba(0,0,0,0.1)',
                    minHeight: '100px',
                    width: '140px',
                    transform: note.isCrumpling ? 'rotateX(45deg) rotateY(-15deg) scale(0.8)' : '',
                    transformStyle: 'preserve-3d',
                    transition: note.isCrumpling ? 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'all 0.2s',
                  }}
                >
                  <CardContent className="p-3 h-full relative">
                    {/* Corner fold effect */}
                    <div className="absolute top-0 right-0 w-4 h-4 bg-black bg-opacity-10 rounded-bl-lg"></div>
                    
                    {/* Completion Checkbox - Big for sticky notes */}
                    <div 
                      className="absolute top-2 left-2 z-30"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNoteCompletion(note.id);
                      }}
                    >
                      <div 
                        className={`w-7 h-7 rounded border-2 cursor-pointer transition-all ${
                          note.isCompleted 
                            ? 'bg-green-500 border-green-500' 
                            : 'bg-white border-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {note.isCompleted && (
                          <Check className="w-5 h-5 text-white absolute top-0.5 left-0.5" />
                        )}
                      </div>
                    </div>
                    
                    {/* Priority indicator with colored dot only */}
                    {note.priority && (
                      <div className={`absolute top-2 right-2 w-4 h-4 rounded-full ${
                        note.priority === 'high' ? 'bg-red-500' :
                        note.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} title={`Priority: ${note.priority}`}>
                      </div>
                    )}
                    
                    {/* Delete button - more visible */}
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        removeIdea(note.id);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100 text-sm font-bold z-10 shadow-lg hover:scale-110"
                      title="Delete this note"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    
                    {/* Note number and date */}
                    <div className="absolute bottom-2 left-2 text-xs text-gray-500 dark:text-gray-400 opacity-70 font-mono">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="bg-gray-200 dark:bg-gray-600 dark:text-gray-200 px-1 rounded">#{index + 1}</span>
                      </div>
                      {note.createdAt && (
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="w-2 h-2" />
                          {new Date(note.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: '2-digit'
                          })}
                        </div>
                      )}
                      {note.dueDate && (
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="w-2 h-2" />
                          <span className={`${
                            new Date(note.dueDate) < new Date() ? 'text-red-500' : 'text-blue-500'
                          }`}>
                            Due: {new Date(note.dueDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Note content with enhanced formatting */}
                    <div className="mt-6 mb-6 h-full overflow-auto pr-2">
                      {editingNote === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full h-12 p-1 text-sm border rounded resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                saveEditedNote(note.id);
                              } else if (e.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEditedNote(note.id)}
                              className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className={`text-sm text-gray-800 dark:text-gray-200 break-words leading-relaxed mb-2 ${
                          note.textStyle?.bold ? 'font-bold' : 'font-medium'
                        } ${
                          note.textStyle?.italic ? 'italic' : ''
                        } ${
                          note.textStyle?.underline ? 'underline' : ''
                        }`}
                        style={{ fontSize: `${note.textStyle?.fontSize || 14}px` }}>
                          {note.content}
                        </p>
                      )}
                      
                      {/* Description if available */}
                      {note.description && note.description.trim() && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 opacity-80 leading-relaxed border-t pt-2 mt-2">
                          {note.description.length > 80 
                            ? `${note.description.substring(0, 80)}...` 
                            : note.description
                          }
                        </p>
                      )}
                    </div>
                    
                    {/* Enhanced controls for formatting and priority */}
                    <div className="absolute -bottom-8 left-0 bg-white dark:bg-gray-800 rounded-md shadow-lg p-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {/* Delete button in control panel */}
                      <button
                        className="w-6 h-6 text-xs bg-red-500 hover:bg-red-600 text-white rounded flex items-center justify-center"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          removeIdea(note.id);
                        }}
                        title="Delete Note"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      
                      {/* Divider */}
                      <div className="w-px h-4 bg-gray-300 mx-1"></div>
                      {/* Text formatting */}
                      <button
                        className="w-6 h-6 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateNoteStyle(note.id, { bold: !note.textStyle?.bold });
                        }}
                        title="Bold"
                      >
                        <Bold className="w-3 h-3" />
                      </button>
                      <button
                        className="w-6 h-6 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateNoteStyle(note.id, { italic: !note.textStyle?.italic });
                        }}
                        title="Italic"
                      >
                        <Italic className="w-3 h-3" />
                      </button>
                      <button
                        className="w-6 h-6 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateNoteStyle(note.id, { underline: !note.textStyle?.underline });
                        }}
                        title="Underline"
                      >
                        <Underline className="w-3 h-3" />
                      </button>
                      
                      {/* Due Date button */}
                      <button
                        className="w-6 h-6 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          openDatePicker(note.id);
                        }}
                        title="Set Due Date"
                      >
                        <CalendarDays className="w-3 h-3" />
                      </button>
                      
                      {/* Font Size button */}
                      <button
                        className="w-6 h-6 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded flex items-center justify-center"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setShowFontSizer(showFontSizer === note.id ? null : note.id);
                        }}
                        title="Adjust Font Size"
                      >
                        <Type className="w-3 h-3" />
                      </button>
                      
                      {/* Font size controls popup */}
                      {showFontSizer === note.id && (
                        <div className="absolute top-8 left-0 bg-white dark:bg-gray-800 border rounded-md shadow-lg p-2 flex flex-col gap-1 z-20">
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Font Size</div>
                          {[10, 12, 14, 16, 18, 20, 24].map(size => (
                            <button
                              key={size}
                              className={`px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                (note.textStyle?.fontSize || 14) === size ? 'bg-purple-100 dark:bg-purple-900' : ''
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateNoteFontSize(note.id, size);
                                setShowFontSizer(null);
                              }}
                            >
                              {size}px
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* Divider */}
                      <div className="w-px h-4 bg-gray-300 mx-1"></div>
                      
                      {/* Priority controls */}
                      <button
                        className={`w-6 h-6 text-xs rounded flex items-center justify-center ${
                          note.priority === 'low' ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-green-100'
                        }`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          updateNotePriority(note.id, 'low');
                        }}
                        title="Low Priority (Green)"
                      >
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </button>
                      <button
                        className={`w-6 h-6 text-xs rounded flex items-center justify-center ${
                          note.priority === 'medium' ? 'bg-yellow-500 text-white' : 'bg-gray-100 hover:bg-yellow-100'
                        }`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          updateNotePriority(note.id, 'medium');
                        }}
                        title="Medium Priority (Yellow)"
                      >
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      </button>
                      <button
                        className={`w-6 h-6 text-xs rounded flex items-center justify-center ${
                          note.priority === 'high' ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-red-100'
                        }`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          updateNotePriority(note.id, 'high');
                        }}
                        title="High Priority (Red)"
                      >
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      </button>
                      
                      {/* Divider */}
                      <div className="w-px h-4 bg-gray-300 mx-1"></div>
                      
                      {/* Shape control */}
                      <button
                        className="w-6 h-6 text-xs bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateNoteShape(note.id, note.shape === 'square' ? 'circle' : note.shape === 'circle' ? 'triangle' : 'square');
                        }}
                        title="Change Shape"
                      >
                        {note.shape === 'square' && <Square className="w-3 h-3" />}
                        {note.shape === 'circle' && <Circle className="w-3 h-3" />}
                        {note.shape === 'triangle' && <Triangle className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute bottom-1 right-8 text-xs text-gray-400 opacity-40">
                      💡
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* Enhanced Empty state with detailed background elements */}
            {stickyNotes.length === 0 && !createTaskMutation.isPending && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500 relative">
                  {/* Decorative background circles */}
                  <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 opacity-20 animate-pulse"></div>
                  <div className="absolute -bottom-20 -right-20 w-32 h-32 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
                  
                  <div className="relative mb-8 z-10">
                    <Lightbulb className="w-24 h-24 mx-auto opacity-40 text-yellow-500" />
                    {/* Enhanced 3D pin for empty state */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                      <div className="w-5 h-5 rounded-full relative"
                           style={{
                             background: `radial-gradient(circle at 30% 30%, 
                               #ff6b6b 0%, 
                               #e74c3c 40%, 
                               #c0392b 70%,
                               #8b0000 100%)`,
                             boxShadow: `
                               0 4px 8px rgba(0,0,0,0.3),
                               inset 0 2px 0 rgba(255,255,255,0.4),
                               inset 0 -1px 0 rgba(0,0,0,0.2)
                             `,
                             opacity: 0.8
                           }}>
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-1 h-8 bg-gradient-to-b from-gray-500 to-gray-600 rounded-full shadow-sm"></div>
                        <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full opacity-60"></div>
                        <div className="absolute bottom-0.5 right-0.5 w-0.5 h-0.5 bg-black rounded-full opacity-30"></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-2xl mb-4 font-semibold text-gray-600">Your brainstorming canvas awaits!</p>
                  <p className="text-sm opacity-75 mb-6">Use Move tool to pan canvas, zoom with scroll wheel, and let your ideas flow</p>
                  
                  {/* Floating instruction cards */}
                  <div className="flex gap-4 justify-center text-xs">
                    <div className="bg-white/80 px-3 py-2 rounded-lg shadow-sm border border-gray-200">
                      <strong>Move Tool:</strong> Drag notes around
                    </div>
                    <div className="bg-white/80 px-3 py-2 rounded-lg shadow-sm border border-gray-200">
                      <strong>Draw Tool:</strong> Sketch your ideas
                    </div>
                    <div className="bg-white/80 px-3 py-2 rounded-lg shadow-sm border border-gray-200">
                      <strong>Connect Tool:</strong> Link related concepts
                    </div>
                  </div>
                </div>
              </div>
            )}


          </div>
        </div>
      </div>
      
      {/* Right-click context menu - rendered at body level */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-500 rounded-lg shadow-2xl py-2 min-w-40"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 99999,
            position: 'fixed',
            pointerEvents: 'auto'
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            onClick={() => {
              startEditingNote(contextMenu.noteId);
              setContextMenu(null);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 text-gray-800 dark:text-gray-200 font-medium"
          >
            <Edit className="w-4 h-4 text-blue-600" />
            Edit Note
          </button>
          <button
            onClick={() => {
              openDatePicker(contextMenu.noteId);
              setContextMenu(null);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-3 text-gray-800 dark:text-gray-200 font-medium"
          >
            <CalendarDays className="w-4 h-4 text-purple-600" />
            Set Due Date
          </button>
          <button
            onClick={() => {
              openRepeatMenu(contextMenu.noteId);
              setContextMenu(null);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-3 text-gray-800 dark:text-gray-200 font-medium"
          >
            <Clock className="w-4 h-4 text-green-600" />
            Set Repeat
          </button>
          <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
          <button
            onClick={() => {
              removeIdea(contextMenu.noteId);
              setContextMenu(null);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-3 font-medium"
          >
            <X className="w-4 h-4" />
            Delete Note
          </button>
        </div>
      )}
      
      {/* Date Picker Popup */}
      {showDatePicker && (
        <div
          className="fixed bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-2xl p-4"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 99999,
            position: 'fixed'
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Set Due Date</h3>
            <button
              onClick={() => setShowDatePicker(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                if (date && showDatePicker) {
                  updateNoteDueDate(showDatePicker, date);
                  setShowDatePicker(null);
                }
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="dark:text-gray-200"
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (showDatePicker) {
                    updateNoteDueDate(showDatePicker, null);
                    setShowDatePicker(null);
                  }
                }}
                className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
              >
                Clear Date
              </button>
              <button
                onClick={() => setShowDatePicker(null)}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Repeat Menu Popup */}
      {showRepeatMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-500 rounded-lg shadow-2xl py-2 min-w-48"
          style={{
            left: `${contextMenu?.x || 200}px`,
            top: `${contextMenu?.y || 200}px`,
            zIndex: 99999,
            position: 'fixed',
            pointerEvents: 'auto'
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Set Repeat</p>
          </div>
          
          {["none", "daily", "weekly", "monthly", "yearly"].map((type) => (
            <button
              key={type}
              onClick={() => handleRepeatOptionClick(type)}
              className={`w-full px-4 py-3 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 text-gray-800 dark:text-gray-200 ${
                selectedRepeatType === type ? 'bg-blue-100 dark:bg-blue-900/30' : ''
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${
                selectedRepeatType === type ? 'bg-blue-600' : 'bg-gray-400'
              }`}></div>
              <span className="capitalize">
                {type === "none" ? "No Repeat" : `Repeat ${type}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}