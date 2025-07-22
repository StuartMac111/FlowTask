import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import TaskList from "@/components/task-list";
import ShareModal from "@/components/share-modal";
import FamilyModal from "@/components/family-modal";
import CreateListModal from "@/components/create-list-modal";
import SettingsDialog from "@/components/settings-dialog";
import UserProfileDropdown from "@/components/user-profile-dropdown";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ListWithTasks } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [createListModalOpen, setCreateListModalOpen] = useState(false);
  const [backgroundTheme, setBackgroundTheme] = useState("default");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  // Fetch user's lists
  const { data: lists = [], refetch: refetchLists } = useQuery<ListWithTasks[]>({
    queryKey: ["/api/lists"],
  });

  // Get currently selected list
  const currentList = lists.find(list => list.id === selectedListId) || lists[0];

  // Set up WebSocket connection
  const { sendMessage } = useWebSocket('/ws', {
    onMessage: (data: any) => {
      if (data.type === 'list_created' || data.type === 'list_updated' || data.type === 'list_deleted' ||
          data.type === 'task_created' || data.type === 'task_updated' || data.type === 'task_deleted') {
        refetchLists();
      }
    },
  });

  // Subscribe to list updates via WebSocket
  useEffect(() => {
    if (user && lists.length > 0) {
      const listIds = lists.map(list => list.id);
      sendMessage({
        type: 'subscribe_lists',
        listIds,
      });
      sendMessage({
        type: 'auth',
        userId: (user as any).id,
      });
    }
  }, [user, lists, sendMessage]);

  // Set initial selected list
  useEffect(() => {
    if (!selectedListId && lists.length > 0) {
      setSelectedListId(lists[0].id);
    }
  }, [lists, selectedListId]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getBackgroundClass = (theme: string) => {
    switch (theme) {
      case "gradient-blue": return "bg-gradient-to-br from-blue-400 to-blue-600";
      case "gradient-purple": return "bg-gradient-to-br from-purple-400 to-purple-600";
      case "gradient-teal": return "bg-gradient-to-br from-teal-400 to-teal-600";
      case "gradient-orange": return "bg-gradient-to-br from-orange-400 to-orange-600";
      case "gradient-pink": return "bg-gradient-to-br from-pink-400 to-pink-600";
      case "pattern-dots": return "bg-white bg-dotted";
      case "pattern-grid": return "bg-white bg-grid";
      default: return "bg-ms-bg dark:bg-gray-900";
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${getBackgroundClass(backgroundTheme)}`}>
      {/* Top Header with TaskFlow title and Toggle Buttons */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <UserProfileDropdown 
              user={user} 
              onLogout={() => window.location.href = "/api/logout"} 
            />
            <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">TaskFlow</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant={viewMode === "desktop" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("desktop")}
                className="h-8 px-3"
              >
                <Monitor className="w-4 h-4 mr-1" />
                Desktop
              </Button>
              <Button
                variant={viewMode === "mobile" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("mobile")}
                className="h-8 px-3"
              >
                <Smartphone className="w-4 h-4 mr-1" />
                Mobile
              </Button>
            </div>
            
            {/* Settings Button */}
            <SettingsDialog
              selectedBackground={backgroundTheme}
              onBackgroundChange={setBackgroundTheme}
            />
          </div>
        </div>
      </div>
      
      {/* Main Content Area with responsive layout */}
      <div className="flex w-full pt-16">
        {viewMode === "desktop" ? (
          <>
            <Sidebar
              lists={lists}
              selectedListId={selectedListId}
              onSelectList={setSelectedListId}
              onCreateList={() => setCreateListModalOpen(true)}
              onManageFamily={() => setFamilyModalOpen(true)}
              user={user as any}
              onRefresh={refetchLists}
            />
            
            <TaskList
              list={currentList}
              allLists={lists}
              onShare={() => setShareModalOpen(true)}
              onRefresh={refetchLists}
            />
          </>
        ) : (
          /* Mobile View - Full width task list with floating sidebar toggle */
          <div className="w-full relative mobile-bottom-spacing">
            <TaskList
              list={currentList}
              allLists={lists}
              onShare={() => setShareModalOpen(true)}
              onRefresh={refetchLists}
            />
            
            {/* Mobile Navigation - Bottom nav bar for touch devices */}
            <div className="fixed bottom-4 left-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-3 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center z-40">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Current List:</label>
                <select
                  value={selectedListId || ''}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border rounded-md text-sm touch-manipulation min-h-[44px]"
                >
                  {lists.map(list => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => setCreateListModalOpen(true)}
                  className="touch-manipulation flex-1 sm:flex-none min-h-[44px]"
                >
                  New List
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setFamilyModalOpen(true)}
                  className="touch-manipulation flex-1 sm:flex-none min-h-[44px]"
                >
                  Groups
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {shareModalOpen && (
        <ShareModal
          list={currentList}
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
        />
      )}

      {familyModalOpen && (
        <FamilyModal
          open={familyModalOpen}
          onOpenChange={setFamilyModalOpen}
        />
      )}

      {createListModalOpen && (
        <CreateListModal
          open={createListModalOpen}
          onOpenChange={setCreateListModalOpen}
          onSuccess={refetchLists}
        />
      )}
    </div>
  );
}
