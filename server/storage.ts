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
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
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
