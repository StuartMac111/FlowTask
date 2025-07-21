import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Palette } from "lucide-react";

const backgroundThemes = [
  { id: "default", name: "Default", preview: "bg-white dark:bg-gray-900" },
  { id: "gradient-blue", name: "Blue Gradient", preview: "bg-gradient-to-br from-blue-400 to-blue-600" },
  { id: "gradient-purple", name: "Purple Gradient", preview: "bg-gradient-to-br from-purple-400 to-purple-600" },
  { id: "gradient-green", name: "Green Gradient", preview: "bg-gradient-to-br from-green-400 to-green-600" },
  { id: "gradient-sunset", name: "Sunset", preview: "bg-gradient-to-br from-orange-400 via-red-500 to-pink-500" },
  { id: "gradient-ocean", name: "Ocean", preview: "bg-gradient-to-br from-teal-400 to-blue-500" },
  { id: "pattern-dots", name: "Dots", preview: "bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]" },
  { id: "pattern-lines", name: "Lines", preview: "bg-white bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%)] [background-size:20px_20px]" },
];

interface BackgroundSelectorProps {
  value: string;
  onChange: (theme: string) => void;
}

export function BackgroundSelector({ value, onChange }: BackgroundSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label>Background Theme</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <Palette className="mr-2 h-4 w-4" />
            {backgroundThemes.find(t => t.id === value)?.name || "Select theme"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="grid grid-cols-2 gap-3">
            {backgroundThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  onChange(theme.id);
                  setIsOpen(false);
                }}
                className={`
                  group relative overflow-hidden rounded-lg border-2 h-20 transition-all
                  ${value === theme.id 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-muted hover:border-border"
                  }
                `}
              >
                <div className={`w-full h-full ${theme.preview}`}>
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-1 left-1 right-1 text-xs font-medium text-white bg-black/50 rounded px-1 py-0.5 truncate">
                    {theme.name}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}