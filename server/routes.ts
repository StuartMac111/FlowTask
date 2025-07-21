import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertGroupSchema,
  insertListSchema,
  insertTaskSchema,
  insertListShareSchema,
} from "@shared/schema";
import { z } from "zod";

interface WebSocketClient extends WebSocket {
  userId?: string;
  listIds?: Set<string>;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // WebSocket clients map
  const wsClients = new Map<string, WebSocketClient>();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Group routes
  app.post('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupData = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(groupData, userId);
      res.json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.get('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groups = await storage.getGroupsForUser(userId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.post('/api/family-groups/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { userId: memberUserId, role } = req.body;
      
      // Check if family group exists and user has permission
      const familyGroup = await storage.getFamilyGroupById(id);
      if (!familyGroup) {
        return res.status(404).json({ message: "Family group not found" });
      }

      // Check if member count is under 8
      if (familyGroup.members.length >= 8) {
        return res.status(400).json({ message: "Family group cannot have more than 8 members" });
      }

      const member = await storage.addFamilyGroupMember(id, memberUserId, role || "member");
      res.json(member);
    } catch (error) {
      console.error("Error adding family member:", error);
      res.status(500).json({ message: "Failed to add family member" });
    }
  });

  // List routes
  app.post('/api/lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const listData = insertListSchema.parse(req.body);
      const list = await storage.createList(listData, userId);
      
      // Broadcast to WebSocket clients
      broadcastToClients(wsClients, { type: 'list_created', data: list });
      
      res.json(list);
    } catch (error) {
      console.error("Error creating list:", error);
      res.status(500).json({ message: "Failed to create list" });
    }
  });

  app.get('/api/lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lists = await storage.getListsForUser(userId);
      res.json(lists);
    } catch (error) {
      console.error("Error fetching lists:", error);
      res.status(500).json({ message: "Failed to fetch lists" });
    }
  });

  app.get('/api/lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const list = await storage.getListById(id);
      if (!list) {
        return res.status(404).json({ message: "List not found" });
      }
      res.json(list);
    } catch (error) {
      console.error("Error fetching list:", error);
      res.status(500).json({ message: "Failed to fetch list" });
    }
  });

  app.put('/api/lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const list = await storage.updateList(id, updates);
      
      // Broadcast to WebSocket clients
      broadcastToListClients(wsClients, id, { type: 'list_updated', data: list });
      
      res.json(list);
    } catch (error) {
      console.error("Error updating list:", error);
      res.status(500).json({ message: "Failed to update list" });
    }
  });

  app.delete('/api/lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteList(id);
      
      // Broadcast to WebSocket clients
      broadcastToListClients(wsClients, id, { type: 'list_deleted', data: { id } });
      
      res.json({ message: "List deleted successfully" });
    } catch (error) {
      console.error("Error deleting list:", error);
      res.status(500).json({ message: "Failed to delete list" });
    }
  });

  app.post('/api/lists/:id/share', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const shareData = insertListShareSchema.parse({ ...req.body, listId: id });
      const share = await storage.shareList(shareData);
      res.json(share);
    } catch (error) {
      console.error("Error sharing list:", error);
      res.status(500).json({ message: "Failed to share list" });
    }
  });

  app.get('/api/lists/:id/shares', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const shares = await storage.getListShares(id);
      res.json(shares);
    } catch (error) {
      console.error("Error fetching list shares:", error);
      res.status(500).json({ message: "Failed to fetch list shares" });
    }
  });

  // Task routes
  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      
      // Broadcast to WebSocket clients
      broadcastToListClients(wsClients, taskData.listId, { type: 'task_created', data: task });
      
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.get('/api/lists/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tasks = await storage.getTasksForList(id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.put('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const task = await storage.updateTask(id, updates);
      
      // Get the list ID to broadcast to correct clients
      const taskWithDetails = await storage.getTaskById(id);
      if (taskWithDetails) {
        broadcastToListClients(wsClients, taskWithDetails.listId, { type: 'task_updated', data: task });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const task = await storage.getTaskById(id);
      if (task) {
        await storage.deleteTask(id);
        broadcastToListClients(wsClients, task.listId, { type: 'task_deleted', data: { id } });
      }
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.get('/api/tasks/user/assigned', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getTasksForUser(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      res.status(500).json({ message: "Failed to fetch user tasks" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocketClient) => {
    const clientId = generateClientId();
    wsClients.set(clientId, ws);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'subscribe_lists') {
          ws.listIds = new Set(data.listIds);
        } else if (data.type === 'auth') {
          ws.userId = data.userId;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      wsClients.delete(clientId);
    });
  });

  return httpServer;
}

function generateClientId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function broadcastToClients(clients: Map<string, WebSocketClient>, message: any) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

function broadcastToListClients(clients: Map<string, WebSocketClient>, listId: string, message: any) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.listIds?.has(listId)) {
      client.send(messageStr);
    }
  });
}
