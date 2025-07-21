import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import TaskList from "@/components/task-list";
import ShareModal from "@/components/share-modal";
import FamilyModal from "@/components/family-modal";
import CreateListModal from "@/components/create-list-modal";
import SettingsDialog from "@/components/settings-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { ListWithTasks } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [createListModalOpen, setCreateListModalOpen] = useState(false);
  const [backgroundTheme, setBackgroundTheme] = useState("default");

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
      {/* Settings Button - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <SettingsDialog
          selectedBackground={backgroundTheme}
          onBackgroundChange={setBackgroundTheme}
        />
      </div>
      
      <Sidebar
        lists={lists}
        selectedListId={selectedListId}
        onSelectList={setSelectedListId}
        onCreateList={() => setCreateListModalOpen(true)}
        onManageFamily={() => setFamilyModalOpen(true)}
        user={user}
      />
      
      <TaskList
        list={currentList}
        onShare={() => setShareModalOpen(true)}
        onRefresh={refetchLists}
      />

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
