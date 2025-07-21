import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus, Move3D, Lightbulb } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { InsertTask, Task } from "@shared/schema";

interface StickyNote {
  id: string;
  content: string;
  x: number;
  y: number;
  color: string;
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
  const whiteboardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Convert tasks to sticky notes on load
  useEffect(() => {
    const notes: StickyNote[] = tasks.map((task, index) => ({
      id: task.id,
      content: task.title,
      x: 100 + (index % 5) * 220,
      y: 100 + Math.floor(index / 5) * 180,
      color: NOTE_COLORS[index % NOTE_COLORS.length],
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

  const addNewIdea = () => {
    if (!newIdeaText.trim()) return;

    // Find a good position for the new note
    const newX = 100 + (stickyNotes.length % 5) * 220;
    const newY = 100 + Math.floor(stickyNotes.length / 5) * 180;
    const newColor = NOTE_COLORS[stickyNotes.length % NOTE_COLORS.length];

    createTaskMutation.mutate({
      title: newIdeaText.trim(),
      listId,
      completed: false,
      priority: "medium",
    });

    setNewIdeaText("");
  };

  const removeIdea = (noteId: string) => {
    deleteTaskMutation.mutate(noteId);
    setStickyNotes(prev => prev.filter(note => note.id !== noteId));
  };

  const handleMouseDown = (e: React.MouseEvent, noteId: string) => {
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
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white dark:bg-gray-900">
        <Lightbulb className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-semibold">Brainstorming Whiteboard</h2>
      </div>

      {/* Add New Idea Input */}
      <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
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

      {/* Whiteboard Canvas */}
      <div 
        ref={whiteboardRef}
        className="flex-1 relative overflow-auto bg-white dark:bg-gray-100"
        style={{
          backgroundImage: `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {stickyNotes.map((note) => (
          <Card
            key={note.id}
            className={`absolute w-48 h-36 cursor-move shadow-lg border-2 transition-transform hover:scale-105 ${
              draggedNote === note.id ? 'z-50 scale-105' : 'z-10'
            }`}
            style={{
              left: note.x,
              top: note.y,
              backgroundColor: note.color,
              borderColor: draggedNote === note.id ? '#6366f1' : 'transparent',
            }}
            onMouseDown={(e) => handleMouseDown(e, note.id)}
          >
            <CardContent className="p-3 h-full relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeIdea(note.id);
                }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute top-1 left-1 opacity-50">
                <Move3D className="w-4 h-4 text-gray-600" />
              </div>
              <div className="mt-4 h-full overflow-auto">
                <p className="text-sm font-medium text-gray-800 break-words leading-tight">
                  {note.content}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {stickyNotes.length === 0 && !createTaskMutation.isPending && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Welcome to your Brainstorming Whiteboard!</p>
              <p className="text-sm">Add your first idea using the input above</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}