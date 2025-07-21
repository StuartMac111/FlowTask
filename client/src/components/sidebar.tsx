import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Users } from "lucide-react";
import type { ListWithTasks, User, FamilyGroupWithMembers } from "@shared/schema";

interface SidebarProps {
  lists: ListWithTasks[];
  selectedListId: string | null;
  onSelectList: (listId: string) => void;
  onCreateList: () => void;
  onManageFamily: () => void;
  user: User;
}

export default function Sidebar({
  lists,
  selectedListId,
  onSelectList,
  onCreateList,
  onManageFamily,
  user
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch family groups
  const { data: familyGroups = [] } = useQuery<FamilyGroupWithMembers[]>({
    queryKey: ["/api/family-groups"],
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

  return (
    <div className="w-80 bg-ms-surface border-r border-ms-border flex flex-col">
      {/* User Profile */}
      <div className="p-4 border-b border-ms-border">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.profileImageUrl || undefined} />
            <AvatarFallback>
              {user.firstName?.[0]}{user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-xs text-ms-text-secondary">{user.email}</p>
          </div>
        </div>
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
            <div
              key={list.id}
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
                <span className="text-sm font-medium">{list.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {list.taskCount}
              </Badge>
            </div>
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
                <div
                  key={list.id}
                  className={`sidebar-item px-4 py-2 cursor-pointer flex items-center justify-between ${
                    selectedListId === list.id ? 'active' : ''
                  }`}
                  onClick={() => onSelectList(list.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Users className="w-4 h-4 text-ms-text-secondary" />
                    <span className="text-sm font-medium">{list.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {list.taskCount}
                  </Badge>
                </div>
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
            Family Groups
          </h4>
          <Button variant="ghost" size="sm" onClick={onManageFamily}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex -space-x-2">
          {familyGroups.slice(0, 1).map((group) =>
            group.members.slice(0, 6).map((member) => (
              <Avatar key={member.user.id} className="w-8 h-8 border-2 border-white">
                <AvatarImage src={member.user.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            ))
          )}
          {familyGroups.length > 0 && familyGroups[0].members.length > 6 && (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-ms-text-secondary">
              +{familyGroups[0].members.length - 6}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}