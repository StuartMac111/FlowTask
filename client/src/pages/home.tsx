import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import TaskList from "@/components/task-list";
import ShareModal from "@/components/share-modal";
import FamilyModal from "@/components/family-modal";
import CreateListModal from "@/components/create-list-modal";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { ListWithTasks } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [createListModalOpen, setCreateListModalOpen] = useState(false);

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

  return (
    <div className="flex h-screen overflow-hidden bg-ms-bg">
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
