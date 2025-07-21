import {
  users,
  familyGroups,
  familyGroupMembers,
  lists,
  listShares,
  tasks,
  type User,
  type UpsertUser,
  type FamilyGroup,
  type InsertFamilyGroup,
  type FamilyGroupMember,
  type List,
  type InsertList,
  type ListShare,
  type InsertListShare,
  type Task,
  type InsertTask,
  type ListWithTasks,
  type TaskWithSubtasks,
  type FamilyGroupWithMembers,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Family group operations
  createFamilyGroup(familyGroup: InsertFamilyGroup, ownerId: string): Promise<FamilyGroup>;
  getFamilyGroupsForUser(userId: string): Promise<FamilyGroupWithMembers[]>;
  getFamilyGroupById(id: string): Promise<FamilyGroupWithMembers | undefined>;
  addFamilyGroupMember(familyGroupId: string, userId: string, role: "member" | "admin"): Promise<FamilyGroupMember>;
  removeFamilyGroupMember(familyGroupId: string, userId: string): Promise<void>;

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

  // Family group operations
  async createFamilyGroup(familyGroup: InsertFamilyGroup, ownerId: string): Promise<FamilyGroup> {
    const [group] = await db
      .insert(familyGroups)
      .values({ ...familyGroup, ownerId })
      .returning();
    
    // Add owner as member
    await db.insert(familyGroupMembers).values({
      familyGroupId: group.id,
      userId: ownerId,
      role: "owner",
    });

    return group;
  }

  async getFamilyGroupsForUser(userId: string): Promise<FamilyGroupWithMembers[]> {
    const memberGroups = await db
      .select({
        group: familyGroups,
        membership: familyGroupMembers,
      })
      .from(familyGroupMembers)
      .innerJoin(familyGroups, eq(familyGroupMembers.familyGroupId, familyGroups.id))
      .where(eq(familyGroupMembers.userId, userId));

    const groupsWithMembers: FamilyGroupWithMembers[] = [];
    
    for (const { group } of memberGroups) {
      const members = await db
        .select({
          membership: familyGroupMembers,
          user: users,
        })
        .from(familyGroupMembers)
        .innerJoin(users, eq(familyGroupMembers.userId, users.id))
        .where(eq(familyGroupMembers.familyGroupId, group.id));

      groupsWithMembers.push({
        ...group,
        members: members.map(({ membership, user }) => ({ ...membership, user })),
      });
    }

    return groupsWithMembers;
  }

  async getFamilyGroupById(id: string): Promise<FamilyGroupWithMembers | undefined> {
    const [group] = await db.select().from(familyGroups).where(eq(familyGroups.id, id));
    if (!group) return undefined;

    const members = await db
      .select({
        membership: familyGroupMembers,
        user: users,
      })
      .from(familyGroupMembers)
      .innerJoin(users, eq(familyGroupMembers.userId, users.id))
      .where(eq(familyGroupMembers.familyGroupId, id));

    return {
      ...group,
      members: members.map(({ membership, user }) => ({ ...membership, user })),
    };
  }

  async addFamilyGroupMember(familyGroupId: string, userId: string, role: "member" | "admin"): Promise<FamilyGroupMember> {
    const [member] = await db
      .insert(familyGroupMembers)
      .values({ familyGroupId, userId, role })
      .returning();
    return member;
  }

  async removeFamilyGroupMember(familyGroupId: string, userId: string): Promise<void> {
    await db
      .delete(familyGroupMembers)
      .where(and(
        eq(familyGroupMembers.familyGroupId, familyGroupId),
        eq(familyGroupMembers.userId, userId)
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
