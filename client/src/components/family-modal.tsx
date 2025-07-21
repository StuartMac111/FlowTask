import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, Mail, Crown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { FamilyGroupWithMembers, InsertFamilyGroup } from "@shared/schema";

interface FamilyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FamilyModal({ open, onOpenChange }: FamilyModalProps) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const { toast } = useToast();

  // Fetch family groups
  const { data: familyGroups = [], refetch } = useQuery<FamilyGroupWithMembers[]>({
    queryKey: ["/api/family-groups"],
  });

  // Create family group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: InsertFamilyGroup) => {
      await apiRequest("POST", "/api/family-groups", groupData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Family group created successfully",
      });
      setGroupName("");
      setGroupDescription("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups"] });
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
        description: "Failed to create family group",
        variant: "destructive",
      });
    },
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      await apiRequest("POST", `/api/family-groups/${groupId}/members`, {
        userId,
        role: "member",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member added successfully",
      });
      setMemberEmail("");
      refetch();
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
        description: "Failed to add member. Make sure the email is valid and the group has less than 8 members.",
        variant: "destructive",
      });
    },
  });

  const handleCreateGroup = () => {
    if (!groupName.trim()) return;

    createGroupMutation.mutate({
      name: groupName,
      description: groupDescription,
    });
  };

  const handleAddMember = (groupId: string) => {
    if (!memberEmail.trim()) return;

    // In a real app, you'd look up the user by email first
    addMemberMutation.mutate({
      groupId,
      userId: memberEmail, // This would be the actual user ID
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <Badge className="bg-yellow-100 text-yellow-800">Owner</Badge>;
      case "admin":
        return <Badge className="bg-blue-100 text-blue-800">Admin</Badge>;
      default:
        return <Badge variant="secondary">Member</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Manage Family Groups
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="groups" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="groups">My Groups</TabsTrigger>
            <TabsTrigger value="create">Create Group</TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="space-y-4">
            {familyGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-ms-text mb-2">
                  No Family Groups Yet
                </h3>
                <p className="text-ms-text-secondary">
                  Create a family group to collaborate on tasks with up to 8 members.
                </p>
              </div>
            ) : (
              familyGroups.map((group) => (
                <div key={group.id} className="border border-ms-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-ms-text-secondary">
                          {group.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {group.members.length}/8 members
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-ms-text">Members</h4>
                    <div className="grid gap-2">
                      {group.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={member.user.profileImageUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {member.user.firstName} {member.user.lastName}
                              </p>
                              <p className="text-xs text-ms-text-secondary">
                                {member.user.email}
                              </p>
                            </div>
                          </div>
                          {getRoleBadge(member.role)}
                        </div>
                      ))}
                    </div>

                    {group.members.length < 8 && (
                      <div className="flex space-x-2 mt-3">
                        <Input
                          type="email"
                          placeholder="Enter email to add member"
                          value={memberEmail}
                          onChange={(e) => setMemberEmail(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => handleAddMember(group.id)}
                          disabled={!memberEmail.trim() || addMemberMutation.isPending}
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <div>
              <Label htmlFor="groupName" className="text-sm font-medium text-ms-text">
                Group Name *
              </Label>
              <Input
                id="groupName"
                type="text"
                placeholder="e.g., Smith Family"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="groupDescription" className="text-sm font-medium text-ms-text">
                Description (Optional)
              </Label>
              <Input
                id="groupDescription"
                type="text"
                placeholder="Brief description of your family group"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Family Group Benefits</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Share tasks and lists with family members</li>
                <li>• Assign tasks to specific people</li>
                <li>• Real-time updates when tasks are modified</li>
                <li>• Support for up to 8 family members</li>
              </ul>
            </div>

            <Button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || createGroupMutation.isPending}
              className="w-full"
            >
              {createGroupMutation.isPending ? "Creating..." : "Create Family Group"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
