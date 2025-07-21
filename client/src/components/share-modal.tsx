import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Copy, Mail, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { List, ListShare, User } from "@shared/schema";

interface ShareModalProps {
  list?: List;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareModal({ list, open, onOpenChange }: ShareModalProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("view");
  const { toast } = useToast();

  // Fetch current shares
  const { data: shares = [], refetch } = useQuery<(ListShare & { user: User })[]>({
    queryKey: [`/api/lists/${list?.id}/shares`],
    enabled: !!list,
  });

  // Share list mutation
  const shareListMutation = useMutation({
    mutationFn: async () => {
      if (!list) return;
      await apiRequest("POST", `/api/lists/${list.id}/share`, {
        userId: email, // In real app, would need to look up user by email
        permission,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "List shared successfully",
      });
      setEmail("");
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
        description: "Failed to share list",
        variant: "destructive",
      });
    },
  });

  const handleShare = () => {
    if (!email.trim()) return;
    shareListMutation.mutate();
  };

  const copyShareLink = () => {
    if (!list) return;
    const link = `${window.location.origin}/shared/${list.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Success",
      description: "Share link copied to clipboard",
    });
  };

  if (!list) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{list.name}"</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Invite by email */}
          <div>
            <Label className="text-sm font-medium text-ms-text mb-2 block">
              Invite by email
            </Label>
            <div className="flex space-x-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleShare}
                disabled={!email.trim() || shareListMutation.isPending}
              >
                <Mail className="w-4 h-4 mr-1" />
                Send
              </Button>
            </div>
          </div>
          
          {/* Share link */}
          <div>
            <Label className="text-sm font-medium text-ms-text mb-2 block">
              Or share link
            </Label>
            <div className="flex space-x-2">
              <Input
                type="text"
                value={`${window.location.origin}/shared/${list.id}`}
                readOnly
                className="flex-1 bg-gray-50"
              />
              <Button variant="outline" onClick={copyShareLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Permissions */}
          <div>
            <Label className="text-sm font-medium text-ms-text mb-2 block">
              Permissions
            </Label>
            <Select value={permission} onValueChange={setPermission}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">Can view</SelectItem>
                <SelectItem value="edit">Can edit</SelectItem>
                <SelectItem value="admin">Can manage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Current shares */}
          {shares.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-ms-text mb-2 block">
                Shared with
              </Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={share.user.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {share.user.firstName?.[0]}{share.user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{share.user.email}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {share.permission}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}