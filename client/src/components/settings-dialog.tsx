import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings, Sun, Moon, Palette } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const BACKGROUND_THEMES = [
  { value: "default", label: "Default", preview: "bg-white" },
  { value: "gradient-blue", label: "Ocean Blue", preview: "bg-gradient-to-br from-blue-400 to-blue-600" },
  { value: "gradient-purple", label: "Purple Dream", preview: "bg-gradient-to-br from-purple-400 to-purple-600" },
  { value: "gradient-teal", label: "Teal Wave", preview: "bg-gradient-to-br from-teal-400 to-teal-600" },
  { value: "gradient-orange", label: "Sunset Orange", preview: "bg-gradient-to-br from-orange-400 to-orange-600" },
  { value: "gradient-pink", label: "Pink Blossom", preview: "bg-gradient-to-br from-pink-400 to-pink-600" },
  { value: "pattern-dots", label: "Dotted Pattern", preview: "bg-white bg-dotted" },
  { value: "pattern-grid", label: "Grid Pattern", preview: "bg-white bg-grid" },
];

interface SettingsDialogProps {
  selectedBackground: string;
  onBackgroundChange: (background: string) => void;
}

export default function SettingsDialog({ selectedBackground, onBackgroundChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your TaskFlow experience with themes and backgrounds.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Theme Toggle */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Appearance
            </Label>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
                className="flex-1"
              >
                <Sun className="h-4 w-4 mr-2" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="flex-1"
              >
                <Moon className="h-4 w-4 mr-2" />
                Dark
              </Button>
            </div>
          </div>

          {/* Background Theme */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Background Theme
            </Label>
            <Select value={selectedBackground} onValueChange={onBackgroundChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a background theme" />
              </SelectTrigger>
              <SelectContent>
                {BACKGROUND_THEMES.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border ${theme.preview}`} />
                      {theme.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}