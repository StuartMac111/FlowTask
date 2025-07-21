import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  password: varchar("password"), // For local auth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phoneNumber: varchar("phone_number").unique(),
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),
  providers: text("providers"), // JSON string of auth providers
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Groups table
export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Group members table
export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { enum: ["owner", "admin", "member"] }).default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Lists table
export const lists = pgTable("lists", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#0078D4"),
  backgroundTheme: varchar("background_theme").default("default"),
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "set null" }),
  isPrivate: boolean("is_private").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// List sharing table
export const listShares = pgTable("list_shares", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  listId: varchar("list_id").references(() => lists.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  permission: varchar("permission", { enum: ["view", "edit", "admin"] }).default("view").notNull(),
  sharedAt: timestamp("shared_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  isCompleted: boolean("is_completed").default(false),
  priority: varchar("priority", { enum: ["low", "medium", "high"] }).default("medium"),
  dueDate: timestamp("due_date"),
  listId: varchar("list_id").references(() => lists.id, { onDelete: "cascade" }).notNull(),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }),
  parentTaskId: varchar("parent_task_id"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedLists: many(lists),
  ownedGroups: many(groups),
  groupMemberships: many(groupMembers),
  listShares: many(listShares),
  assignedTasks: many(tasks),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(users, {
    fields: [groups.ownerId],
    references: [users.id],
  }),
  members: many(groupMembers),
  lists: many(lists),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  owner: one(users, {
    fields: [lists.ownerId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [lists.groupId],
    references: [groups.id],
  }),
  tasks: many(tasks),
  shares: many(listShares),
}));

export const listSharesRelations = relations(listShares, ({ one }) => ({
  list: one(lists, {
    fields: [listShares.listId],
    references: [lists.id],
  }),
  user: one(users, {
    fields: [listShares.userId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  list: one(lists, {
    fields: [tasks.listId],
    references: [lists.id],
  }),
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
  }),
  subtasks: many(tasks),
}));

// Zod schemas for validation
export const upsertUserSchema = createInsertSchema(users);
export const insertGroupSchema = createInsertSchema(groups).omit({ id: true, ownerId: true, createdAt: true, updatedAt: true });
export const insertListSchema = createInsertSchema(lists).omit({ id: true, ownerId: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertListShareSchema = createInsertSchema(listShares).omit({ id: true, sharedAt: true });

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;
export type List = typeof lists.$inferSelect;
export type InsertList = z.infer<typeof insertListSchema>;
export type ListShare = typeof listShares.$inferSelect;
export type InsertListShare = z.infer<typeof insertListShareSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

// Extended types for API responses
export type ListWithTasks = List & {
  tasks: Task[];
  taskCount: number;
};

export type TaskWithSubtasks = Task & {
  assignee?: User;
  subtasks: Task[];
};

export type GroupWithMembers = Group & {
  members: (GroupMember & { user: User })[];
};
