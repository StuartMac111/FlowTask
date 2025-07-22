import {
  users,
  groups,
  groupMembers,
  lists,
  listShares,
  tasks,
  type User,
  type UpsertUser,
  type Group,
  type InsertGroup,
  type GroupMember,
  type List,
  type InsertList,
  type ListShare,
  type InsertListShare,
  type Task,
  type InsertTask,
  type ListWithTasks,
  type TaskWithSubtasks,
  type GroupWithMembers,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProvider(provider: string, providerId: string): Promise<User | undefined>;
  linkProvider(userId: string, provider: string, providerId: string): Promise<void>;
  upsertUser(user: UpsertUser): Promise<User>;
  createDefaultLists(userId: string): Promise<void>;

  // Group operations
  createGroup(group: InsertGroup, ownerId: string): Promise<Group>;
  getGroupsForUser(userId: string): Promise<GroupWithMembers[]>;
  getGroupById(id: string): Promise<GroupWithMembers | undefined>;
  addGroupMember(groupId: string, userId: string, role: "member" | "admin"): Promise<GroupMember>;
  removeGroupMember(groupId: string, userId: string): Promise<void>;

  // List operations
  createList(list: InsertList, ownerId: string): Promise<List>;
  getListsForUser(userId: string): Promise<ListWithTasks[]>;
  getListById(id: string): Promise<ListWithTasks | undefined>;
  updateList(id: string, updates: Partial<InsertList>): Promise<List>;
  deleteList(id: string): Promise<void>;
  shareList(share: InsertListShare): Promise<ListShare>;
  getListShares(listId: string): Promise<(ListShare & { user: User })[]>;

  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  getTasksForList(listId: string): Promise<TaskWithSubtasks[]>;
  getTaskById(id: string): Promise<TaskWithSubtasks | undefined>;
  updateTask(id: string, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  getTasksForUser(userId: string): Promise<TaskWithSubtasks[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByProvider(provider: string, providerId: string): Promise<User | undefined> {
    const allUsers = await db.select().from(users);
    for (const user of allUsers) {
      if (user.providers) {
        try {
          const providers = JSON.parse(user.providers);
          if (providers.some((p: any) => p.provider === provider && p.providerId === providerId)) {
            return user;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
    return undefined;
  }

  async linkProvider(userId: string, provider: string, providerId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    let providers = [];
    if (user.providers) {
      try {
        providers = JSON.parse(user.providers);
      } catch (e) {
        providers = [];
      }
    }

    providers.push({ provider, providerId });
    
    await db
      .update(users)
      .set({ 
        providers: JSON.stringify(providers),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    // Check if this is a new user and create default lists
    const existingLists = await db
      .select()
      .from(lists)
      .where(eq(lists.ownerId, user.id))
      .limit(1);
    
    if (existingLists.length === 0) {
      await this.createDefaultLists(user.id);
    }
    
    return user;
  }





  // Group operations
  async createGroup(group: InsertGroup, ownerId: string): Promise<Group> {
    const [newGroup] = await db
      .insert(groups)
      .values({ ...group, ownerId })
      .returning();
    
    // Add owner as member
    await db.insert(groupMembers).values({
      groupId: newGroup.id,
      userId: ownerId,
      role: "owner",
    });

    return newGroup;
  }

  async getGroupsForUser(userId: string): Promise<GroupWithMembers[]> {
    const memberGroups = await db
      .select({
        group: groups,
        membership: groupMembers,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, userId));

    const groupsWithMembers: GroupWithMembers[] = [];
    
    for (const { group } of memberGroups) {
      const members = await db
        .select({
          membership: groupMembers,
          user: users,
        })
        .from(groupMembers)
        .innerJoin(users, eq(groupMembers.userId, users.id))
        .where(eq(groupMembers.groupId, group.id));

      groupsWithMembers.push({
        ...group,
        members: members.map(({ membership, user }) => ({ ...membership, user })),
      });
    }

    return groupsWithMembers;
  }

  async getGroupById(id: string): Promise<GroupWithMembers | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    if (!group) return undefined;

    const members = await db
      .select({
        membership: groupMembers,
        user: users,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, id));

    return {
      ...group,
      members: members.map(({ membership, user }) => ({ ...membership, user })),
    };
  }

  async addGroupMember(groupId: string, userId: string, role: "member" | "admin"): Promise<GroupMember> {
    const [member] = await db
      .insert(groupMembers)
      .values({ groupId, userId, role })
      .returning();
    return member;
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await db
      .delete(groupMembers)
      .where(and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId)
      ));
  }

  async createDefaultLists(userId: string): Promise<void> {
    // Check if user already has these default lists
    const existingLists = await db
      .select({ name: lists.name })
      .from(lists)
      .where(eq(lists.ownerId, userId));
    
    const existingListNames = existingLists.map(l => l.name);
    const neededLists = [];
    
    if (!existingListNames.includes("My Day")) {
      neededLists.push({
        name: "My Day",
        description: "Tasks for today",
        color: "#0078D4",
        ownerId: userId,
        isPrivate: true,
      });
    }
    
    if (!existingListNames.includes("Tasks assigned to me")) {
      neededLists.push({
        name: "Tasks assigned to me",
        description: "Tasks that others have assigned to you",
        color: "#7C3AED",
        ownerId: userId,
        isPrivate: true,
      });
    }
    
    if (!existingListNames.includes("Tasks")) {
      neededLists.push({
        name: "Tasks",
        description: "All your tasks and sticky notes",
        color: "#2563EB",
        ownerId: userId,
        isPrivate: true,
      });
    }
    
    if (!existingListNames.includes("Completed Tasks")) {
      neededLists.push({
        name: "Completed Tasks",
        description: "Finished tasks and sticky notes",
        color: "#16A34A",
        ownerId: userId,
        isPrivate: true,
      });
    }
    
    if (!existingListNames.includes("Shopping list")) {
      neededLists.push({
        name: "Shopping list",
        description: "Things to buy",
        color: "#059669",
        ownerId: userId,
        isPrivate: true,
      });
    }
    
    if (!existingListNames.includes("Brainstorming")) {
      neededLists.push({
        name: "Brainstorming",
        description: "Ideas and creative thoughts - whiteboard mode",
        color: "#8E44AD",
        ownerId: userId,
        isPrivate: true,
      });
    }
    
    if (!existingListNames.includes("Statistics")) {
      neededLists.push({
        name: "Statistics",
        description: "Task completion stats and performance metrics",
        color: "#DC2626",
        ownerId: userId,
        isPrivate: true,
      });
    }
    
    if (neededLists.length > 0) {
      await db.insert(lists).values(neededLists);
    }
  }

  // Daily cleanup function for "My Day" list
  async cleanupMyDayList(): Promise<void> {
    try {
      const myDayLists = await db
        .select()
        .from(lists)
        .where(eq(lists.name, "My Day"));

      for (const list of myDayLists) {
        // Get all tasks in "My Day" list
        const myDayTasks = await db
          .select()
          .from(tasks)
          .where(eq(tasks.listId, list.id));

        // Get the "Tasks" list for this user to move tasks to
        const [tasksList] = await db
          .select()
          .from(lists)
          .where(and(
            eq(lists.ownerId, list.ownerId),
            eq(lists.name, "Tasks")
          ));

        if (!tasksList) continue;

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        for (const task of myDayTasks) {
          let shouldMove = true;
          
          // Don't move completed tasks
          if (task.isCompleted) {
            shouldMove = false;
          }
          
          // Don't move tasks that are due today or later
          if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            if (dueDate >= tomorrow) {
              shouldMove = false;
            }
          }

          // Move task to "Tasks" list if it should be moved
          if (shouldMove) {
            await db
              .update(tasks)
              .set({ listId: tasksList.id })
              .where(eq(tasks.id, task.id));
          }
        }
      }
      
      console.log("Daily My Day cleanup completed successfully");
    } catch (error) {
      console.error("Error during My Day cleanup:", error);
    }
  }

  // List operations
  async createList(list: InsertList, ownerId: string): Promise<List> {
    const [newList] = await db
      .insert(lists)
      .values({ ...list, ownerId })
      .returning();
    return newList;
  }

  async getListsForUser(userId: string): Promise<ListWithTasks[]> {
    // Get owned lists
    const ownedLists = await db
      .select()
      .from(lists)
      .where(eq(lists.ownerId, userId))
      .orderBy(asc(lists.createdAt));

    // Get shared lists
    const sharedListsQuery = await db
      .select({ list: lists })
      .from(listShares)
      .innerJoin(lists, eq(listShares.listId, lists.id))
      .where(eq(listShares.userId, userId));

    const sharedLists = sharedListsQuery.map(({ list }) => list);
    const allLists = [...ownedLists, ...sharedLists];

    // Get tasks for each list
    const listsWithTasks: ListWithTasks[] = [];
    for (const list of allLists) {
      const listTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.listId, list.id))
        .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

      listsWithTasks.push({
        ...list,
        tasks: listTasks,
        taskCount: listTasks.length,
      });
    }

    return listsWithTasks;
  }

  async getListById(id: string): Promise<ListWithTasks | undefined> {
    const [list] = await db.select().from(lists).where(eq(lists.id, id));
    if (!list) return undefined;

    const listTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.listId, id))
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

    return {
      ...list,
      tasks: listTasks,
      taskCount: listTasks.length,
    };
  }

  async updateList(id: string, updates: Partial<InsertList>): Promise<List> {
    const [updatedList] = await db
      .update(lists)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(lists.id, id))
      .returning();
    return updatedList;
  }

  async deleteList(id: string): Promise<void> {
    await db.delete(lists).where(eq(lists.id, id));
  }

  async shareList(share: InsertListShare): Promise<ListShare> {
    const [newShare] = await db.insert(listShares).values(share).returning();
    return newShare;
  }

  async getListShares(listId: string): Promise<(ListShare & { user: User })[]> {
    const shares = await db
      .select({
        share: listShares,
        user: users,
      })
      .from(listShares)
      .innerJoin(users, eq(listShares.userId, users.id))
      .where(eq(listShares.listId, listId));

    return shares.map(({ share, user }) => ({ ...share, user }));
  }

  // Task operations
  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async getTasksForList(listId: string): Promise<TaskWithSubtasks[]> {
    const allTasks = await db
      .select({
        task: tasks,
        assignee: users,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(eq(tasks.listId, listId))
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

    // Separate parent tasks and subtasks
    const parentTasks = allTasks.filter(({ task }) => !task.parentTaskId);
    const subtaskMap = new Map<string, typeof allTasks>();

    allTasks
      .filter(({ task }) => task.parentTaskId)
      .forEach(({ task, assignee }) => {
        const parentId = task.parentTaskId!;
        if (!subtaskMap.has(parentId)) {
          subtaskMap.set(parentId, []);
        }
        subtaskMap.get(parentId)!.push({ task, assignee });
      });

    return parentTasks.map(({ task, assignee }) => ({
      ...task,
      assignee: assignee || undefined,
      subtasks: (subtaskMap.get(task.id) || []).map(({ task: subtask }) => subtask),
    }));
  }

  async getTaskById(id: string): Promise<TaskWithSubtasks | undefined> {
    const taskResult = await db
      .select({
        task: tasks,
        assignee: users,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(eq(tasks.id, id));

    if (taskResult.length === 0) return undefined;

    const { task, assignee } = taskResult[0];

    // Get subtasks
    const subtasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, id))
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

    return {
      ...task,
      assignee: assignee || undefined,
      subtasks,
    };
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getTasksForUser(userId: string): Promise<TaskWithSubtasks[]> {
    const userTasks = await db
      .select({
        task: tasks,
        assignee: users,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(eq(tasks.assignedTo, userId))
      .orderBy(desc(tasks.createdAt));

    return userTasks.map(({ task, assignee }) => ({
      ...task,
      assignee: assignee || undefined,
      subtasks: [], // Subtasks would need separate query if needed
    }));
  }
}

export const storage = new DatabaseStorage();
