import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus, Move3D, Lightbulb, Calendar, AlertCircle, CheckCircle, Clock, Palette, Download, Link, Square, Circle, Triangle, Type, Bold, Italic, Underline, Minus } from "lucide-react";
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
  priority?: "low" | "medium" | "high";
  createdAt?: Date;
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
  const whiteboardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Convert tasks to sticky notes on load
  useEffect(() => {
    const notes: StickyNote[] = tasks.map((task, index) => ({
      id: task.id,
      content: task.title,
      x: 20 + (index % 10) * 150,
      y: 50 + Math.floor(index / 10) * 120,
      color: NOTE_COLORS[index % NOTE_COLORS.length],
      priority: task.priority || undefined,
      createdAt: task.createdAt || undefined,
      description: task.description || "",
      shape: "square",
      textStyle: { bold: false, italic: false, underline: false, fontSize: 14 },
      connections: [],
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

    // Find a good position for the new note across wider whiteboard
    const newX = 20 + (stickyNotes.length % 10) * 150;
    const newY = 50 + Math.floor(stickyNotes.length / 10) * 120;
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
      <div className="flex-1 p-0 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-800 dark:to-gray-900">
        {/* Maximum Width Whiteboard Frame - Edge to Edge */}
        <div className="w-full h-full relative bg-white dark:bg-gray-50 overflow-hidden"
             style={{
               border: '25px solid #8B4513',
               borderLeft: '0px solid #8B4513',
               borderRight: '0px solid #8B4513',
               borderTop: '25px solid #8B4513',
               borderBottom: '25px solid #8B4513',
               marginLeft: '-25px',
               marginRight: '-25px',
               width: 'calc(100% + 50px)',
               boxShadow: `
                 inset 0 0 0 20px #A0522D,
                 inset 0 0 0 30px #CD853F,
                 inset 0 0 0 40px #DEB887,
                 0 40px 80px rgba(0,0,0,0.6),
                 0 25px 50px rgba(0,0,0,0.5)
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
            onMouseMove={selectedTool === "draw" ? continueDrawing : handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseDown={selectedTool === "draw" ? startDrawing : undefined}
            onMouseLeave={handleMouseUp}
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
                onClick={(e) => handleNoteClick(note.id, e)}
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
                  }`}
                  style={{
                    backgroundColor: note.color,
                    borderColor: draggedNote === note.id ? '#6366f1' : 
                                connectingFrom === note.id ? '#3b82f6' : 'rgba(0,0,0,0.1)',
                    minHeight: '100px',
                    width: '140px',
                  }}
                >
                  <CardContent className="p-3 h-full relative">
                    {/* Corner fold effect */}
                    <div className="absolute top-0 right-0 w-4 h-4 bg-black bg-opacity-10 rounded-bl-lg"></div>
                    
                    {/* Priority indicator with icon */}
                    {note.priority && (
                      <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs font-bold ${
                        note.priority === 'high' ? 'bg-red-500' :
                        note.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} title={`Priority: ${note.priority}`}>
                        {note.priority === 'high' && <AlertCircle className="w-2 h-2" />}
                        {note.priority === 'medium' && <Clock className="w-2 h-2" />}
                        {note.priority === 'low' && <CheckCircle className="w-2 h-2" />}
                        <span className="uppercase">{note.priority}</span>
                      </div>
                    )}
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeIdea(note.id);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 hover:opacity-100 text-xs font-bold z-10"
                    >
                      ×
                    </button>
                    
                    {/* Note number and date */}
                    <div className="absolute bottom-2 left-2 text-xs text-gray-500 opacity-70 font-mono">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="bg-gray-200 px-1 rounded">#{index + 1}</span>
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
                    </div>
                    
                    {/* Note content with enhanced formatting */}
                    <div className="mt-6 mb-6 h-full overflow-auto pr-2">
                      <p className={`text-sm text-gray-800 break-words leading-relaxed mb-2 ${
                        note.textStyle?.bold ? 'font-bold' : 'font-medium'
                      } ${
                        note.textStyle?.italic ? 'italic' : ''
                      } ${
                        note.textStyle?.underline ? 'underline' : ''
                      }`}
                      style={{ fontSize: `${note.textStyle?.fontSize || 14}px` }}>
                        {note.content}
                      </p>
                      
                      {/* Description if available */}
                      {note.description && note.description.trim() && (
                        <p className="text-xs text-gray-600 opacity-80 leading-relaxed border-t pt-2 mt-2">
                          {note.description.length > 80 
                            ? `${note.description.substring(0, 80)}...` 
                            : note.description
                          }
                        </p>
                      )}
                    </div>
                    
                    {/* Enhanced controls for formatting */}
                    <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        className="w-4 h-4 text-xs bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateNoteStyle(note.id, { bold: !note.textStyle?.bold });
                        }}
                        title="Bold"
                      >
                        <Bold className="w-2 h-2" />
                      </button>
                      <button
                        className="w-4 h-4 text-xs bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateNoteShape(note.id, note.shape === 'square' ? 'circle' : note.shape === 'circle' ? 'triangle' : 'square');
                        }}
                        title="Change Shape"
                      >
                        {note.shape === 'square' && <Square className="w-2 h-2" />}
                        {note.shape === 'circle' && <Circle className="w-2 h-2" />}
                        {note.shape === 'triangle' && <Triangle className="w-2 h-2" />}
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