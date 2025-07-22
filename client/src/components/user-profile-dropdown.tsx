import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Settings, LogOut, Moon, Sun, UserCog, Users } from "lucide-react";
import { useTheme } from "next-themes";

interface UserProfileDropdownProps {
  user: any;
  onLogout: () => void;
}

export default function UserProfileDropdown({ user, onLogout }: UserProfileDropdownProps) {
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const { theme, setTheme } = useTheme();

  const handleSaveProfile = async () => {
    try {
      // Here you would implement the profile update API call
      console.log("Saving profile:", { name: editName, email: editEmail });
      setShowProfileEditor(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      ?.split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                {getUserInitials(user?.name || "User")}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-2">
          <div className="flex items-center gap-3 p-2 mb-2">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                {getUserInitials(user?.name || "User")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-lg text-gray-900 dark:text-gray-100">
                {user?.name || "User"}
              </p>
              <p className="text-base text-gray-600 dark:text-gray-400">
                {user?.email || "user@example.com"}
              </p>
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowProfileEditor(true)} className="text-lg p-3">
            <UserCog className="mr-3 h-5 w-5" />
            Edit Profile
          </DropdownMenuItem>
          
          <DropdownMenuItem className="text-lg p-3">
            <Users className="mr-3 h-5 w-5" />
            Switch Accounts
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center">
              {theme === "dark" ? <Moon className="mr-3 h-5 w-5" /> : <Sun className="mr-3 h-5 w-5" />}
              <span className="text-lg">Dark Mode</span>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={onLogout} className="text-lg p-3 text-red-600 dark:text-red-400">
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Editor Dialog */}
      <Dialog open={showProfileEditor} onOpenChange={setShowProfileEditor}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="flex justify-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-blue-600 text-white text-2xl font-semibold">
                  {getUserInitials(user?.name || "User")}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-lg">Display Name</Label>
                <Input
                  id="name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 text-lg p-3"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-lg">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 text-lg p-3"
                  placeholder="Enter your email"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowProfileEditor(false)} className="text-lg px-6 py-3">
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} className="text-lg px-6 py-3 bg-blue-600 hover:bg-blue-700">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}