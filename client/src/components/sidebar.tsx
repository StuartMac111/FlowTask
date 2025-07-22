import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, Users, Edit, Trash2, Merge, LogOut, Settings, User as UserIcon, ChevronDown, Palette } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import ListEditor from "./list-editor";
import type { ListWithTasks, User, GroupWithMembers } from "@shared/schema";

interface SidebarProps {
  lists: ListWithTasks[];
  selectedListId: string | null;
  onSelectList: (listId: string) => void;
  onCreateList: () => void;
  onManageFamily: () => void;
  user: User;
  onRefresh?: () => void;
}

export default function Sidebar({
  lists,
  selectedListId,
  onSelectList,
  onCreateList,
  onManageFamily,
  user,
  onRefresh
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<ListWithTasks | null>(null);
  const [editingList, setEditingList] = useState<ListWithTasks | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showListEditor, setShowListEditor] = useState(false);
  const [listToEdit, setListToEdit] = useState<ListWithTasks | null>(null);
  const { toast } = useToast();

  // Fetch groups
  const { data: groups = [] } = useQuery<GroupWithMembers[]>({
    queryKey: ["/api/groups"],
  });

  // Filter lists based on search
  const filteredLists = lists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate private and shared lists
  const privateLists = filteredLists.filter(list => list.isPrivate);
  const sharedLists = filteredLists.filter(list => !list.isPrivate);

  const getListColor = (color: string) => ({
    backgroundColor: color,
  });

  // Delete list mutation
  const deleteListMutation = useMutation({
    mutationFn: async (listId: string) => {
      await apiRequest("DELETE", `/api/lists/${listId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "List deleted successfully",
      });
      setDeleteDialogOpen(false);
      setListToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      onRefresh?.();
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
        description: "Failed to delete list",
        variant: "destructive",
      });
    },
  });

  // Edit list mutation
  const editListMutation = useMutation({
    mutationFn: async ({ listId, title }: { listId: string; title: string }) => {
      await apiRequest("PUT", `/api/lists/${listId}`, { name: title });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "List updated successfully",
      });
      setEditingList(null);
      setEditTitle("");
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      onRefresh?.();
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
        description: "Failed to update list",
        variant: "destructive",
      });
    },
  });

  const handleDeleteList = (list: ListWithTasks) => {
    setListToDelete(list);
    setDeleteDialogOpen(true);
  };

  const handleEditList = (list: ListWithTasks) => {
    setListToEdit(list);
    setShowListEditor(true);
  };

  const handleQuickEditList = (list: ListWithTasks) => {
    setEditingList(list);
    setEditTitle(list.name);
  };

  const handleSaveEdit = () => {
    if (editingList && editTitle.trim()) {
      editListMutation.mutate({
        listId: editingList.id,
        title: editTitle.trim(),
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingList(null);
    setEditTitle("");
  };

  return (
    <div className="w-80 bg-ms-surface border-r border-ms-border flex flex-col">
      {/* User Profile Dropdown */}
      <div className="p-4 border-b border-ms-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.profileImageUrl || undefined} />
                <AvatarFallback className="bg-blue-500 text-white">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">{user.email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuItem onClick={() => {
              toast({ title: "Edit Profile", description: "Profile editing feature coming soon!" });
            }}>
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              toast({ title: "Switch Accounts", description: "Account switching feature coming soon!" });
            }}>
              <UserIcon className="w-4 h-4 mr-2" />
              Switch Accounts
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <span className="mr-2">🌙</span>
              <ThemeToggle />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                window.location.href = "/api/logout";
              }}
              className="text-red-600 dark:text-red-400"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-ms-text-secondary" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lists Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pb-2">
          <h4 className="text-xs font-semibold text-ms-text-secondary uppercase tracking-wide">
            My Lists
          </h4>
        </div>

        {/* Private Lists */}
        <div className="space-y-1">
          {privateLists.map((list) => (
            <ContextMenu key={list.id}>
              <ContextMenuTrigger asChild>
                <div
                  className={`sidebar-item px-4 py-2 cursor-pointer flex items-center justify-between ${
                    selectedListId === list.id ? 'active' : ''
                  }`}
                  onClick={() => onSelectList(list.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={getListColor(list.color || "#0078D4")}
                    />
                    {editingList?.id === list.id ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        onBlur={handleSaveEdit}
                        className="text-sm h-6 px-1 py-0"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-sm font-medium">{list.name}</span>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {list.taskCount}
                  </Badge>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleQuickEditList(list)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Rename
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleEditList(list)}>
                  <Palette className="w-4 h-4 mr-2" />
                  Edit List
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleDeleteList(list)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </ContextMenuItem>
                <ContextMenuItem onClick={() => toast({ title: "Merge feature", description: "Merge functionality coming soon!" })}>
                  <Merge className="w-4 h-4 mr-2" />
                  Merge with...
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>

        {/* Shared Lists */}
        {sharedLists.length > 0 && (
          <div className="mt-6">
            <div className="px-4 pb-2">
              <h4 className="text-xs font-semibold text-ms-text-secondary uppercase tracking-wide">
                Shared Lists
              </h4>
            </div>
            <div className="space-y-1">
              {sharedLists.map((list) => (
                <ContextMenu key={list.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={`sidebar-item px-4 py-2 cursor-pointer flex items-center justify-between ${
                        selectedListId === list.id ? 'active' : ''
                      }`}
                      onClick={() => onSelectList(list.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <Users className="w-4 h-4 text-ms-text-secondary" />
                        {editingList?.id === list.id ? (
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            onBlur={handleSaveEdit}
                            className="text-sm h-6 px-1 py-0"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm font-medium">{list.name}</span>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {list.taskCount}
                      </Badge>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleQuickEditList(list)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleEditList(list)}>
                      <Palette className="w-4 h-4 mr-2" />
                      Edit List
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleDeleteList(list)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => toast({ title: "Merge feature", description: "Merge functionality coming soon!" })}>
                      <Merge className="w-4 h-4 mr-2" />
                      Merge with...
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          </div>
        )}

        {/* Add List Button */}
        <div className="px-4 py-2 mt-4">
          <Button
            variant="ghost"
            onClick={onCreateList}
            className="w-full justify-start text-primary hover:bg-primary/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create new list
          </Button>
        </div>
      </div>

      {/* Family Section */}
      <div className="border-t border-ms-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-ms-text-secondary uppercase tracking-wide">
            Groups
          </h4>
          <Button variant="ghost" size="sm" onClick={onManageFamily}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex -space-x-2">
          {groups.slice(0, 1).map((group) =>
            group.members.slice(0, 6).map((member) => (
              <Avatar key={member.user.id} className="w-8 h-8 border-2 border-white">
                <AvatarImage src={member.user.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            ))
          )}
          {groups.length > 0 && groups[0].members.length > 6 && (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-ms-text-secondary">
              +{groups[0].members.length - 6}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{listToDelete?.name}"? This action cannot be undone and will delete all tasks in this list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (listToDelete) {
                  deleteListMutation.mutate(listToDelete.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* List Editor Dialog */}
      {showListEditor && listToEdit && (
        <ListEditor
          list={listToEdit}
          isOpen={showListEditor}
          onClose={() => {
            setShowListEditor(false);
            setListToEdit(null);
          }}
          onRefresh={onRefresh || (() => {})}
        />
      )}
    </div>
  );
}