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

      {/* Enhanced Whiteboard Canvas with Massive Frame */}
      <div className="flex-1 p-12 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-800 dark:to-gray-900">
        {/* Massive Whiteboard Frame with 3D Effect */}
        <div className="w-full h-full relative bg-white dark:bg-gray-50 rounded-xl overflow-hidden"
             style={{
               border: '20px solid #8B4513',
               boxShadow: `
                 inset 0 0 0 8px #A0522D,
                 inset 0 0 0 12px #CD853F,
                 inset 0 0 0 16px #DEB887,
                 0 20px 40px rgba(0,0,0,0.3),
                 0 10px 20px rgba(0,0,0,0.2)
               `
             }}>
          <div 
            ref={whiteboardRef}
            className="w-full h-full relative overflow-auto"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Sticky Notes with Realistic Pins */}
            {stickyNotes.map((note, index) => (
              <div
                key={note.id}
                className="absolute cursor-move select-none"
                style={{
                  left: note.x,
                  top: note.y,
                  width: '180px',
                  minHeight: '120px',
                  transform: `rotate(${(index % 5) - 2}deg)`,
                  zIndex: draggedNote === note.id ? 50 : 10,
                }}
                onMouseDown={(e) => handleMouseDown(e, note.id)}
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
                
                {/* Enhanced Sticky Note */}
                <Card
                  className={`w-full h-full shadow-lg border-2 transition-all duration-200 ${
                    draggedNote === note.id ? 'scale-105 shadow-xl' : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: note.color,
                    borderColor: draggedNote === note.id ? '#6366f1' : 'rgba(0,0,0,0.1)',
                  }}
                >
                  <CardContent className="p-3 h-full relative">
                    {/* Corner fold effect */}
                    <div className="absolute top-0 right-0 w-4 h-4 bg-black bg-opacity-10 rounded-bl-lg"></div>
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeIdea(note.id);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 hover:opacity-100 text-xs font-bold"
                    >
                      ×
                    </button>
                    
                    {/* Note number */}
                    <div className="absolute bottom-1 left-2 text-xs text-gray-500 opacity-60 font-mono">
                      #{index + 1}
                    </div>
                    
                    {/* Note content */}
                    <div className="mt-2 h-full overflow-auto pr-2">
                      <p className="text-sm font-medium text-gray-800 break-words leading-tight">
                        {note.content}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* Empty state with 3D pin */}
            {stickyNotes.length === 0 && !createTaskMutation.isPending && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="relative mb-8">
                    <Lightbulb className="w-20 h-20 mx-auto opacity-30" />
                    {/* Decorative 3D pin for empty state */}
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                      <div className="w-4 h-4 rounded-full relative"
                           style={{
                             background: `radial-gradient(circle at 30% 30%, 
                               #ff6b6b 0%, 
                               #e74c3c 50%, 
                               #c0392b 100%)`,
                             boxShadow: `
                               0 2px 4px rgba(0,0,0,0.2),
                               inset 0 1px 0 rgba(255,255,255,0.3)
                             `,
                             opacity: 0.6
                           }}>
                        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-gray-400 rounded-full opacity-60"></div>
                        <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full opacity-50"></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xl mb-3 font-medium">Your brainstorming whiteboard awaits!</p>
                  <p className="text-sm opacity-75">Add sticky notes with your creative ideas</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}