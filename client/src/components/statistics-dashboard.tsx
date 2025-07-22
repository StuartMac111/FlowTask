import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, TrendingUp, Target, Calendar, User, BarChart3 } from "lucide-react";
import type { ListWithTasks, Task } from "@shared/schema";

interface StatisticsDashboardProps {
  lists: ListWithTasks[];
  listId: string;
}

interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  tasksAssignedToMe: number;
  completedAssignedTasks: number;
  assignedCompletionRate: number;
  todayTasks: number;
  completedTodayTasks: number;
  thisWeekTasks: number;
  completedThisWeekTasks: number;
  averageCompletionTime: number;
  priorityBreakdown: {
    high: { total: number; completed: number };
    medium: { total: number; completed: number };
    low: { total: number; completed: number };
  };
}

export default function StatisticsDashboard({ lists, listId }: StatisticsDashboardProps) {
  const stats: TaskStats = useMemo(() => {
    // Get all tasks from all lists
    const allTasks: Task[] = lists.flatMap(list => list.tasks || []);
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.isCompleted).length;
    const pendingTasks = totalTasks - completedTasks;
    
    const overdueTasks = allTasks.filter(task => 
      !task.isCompleted && 
      task.dueDate && 
      new Date(task.dueDate) < now
    ).length;
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Tasks assigned to user (for now, we'll consider tasks in "Tasks assigned to me" list)
    const assignedTasksList = lists.find(list => list.name === "Tasks assigned to me");
    const assignedTasks = assignedTasksList?.tasks || [];
    const tasksAssignedToMe = assignedTasks.length;
    const completedAssignedTasks = assignedTasks.filter(task => task.isCompleted).length;
    const assignedCompletionRate = tasksAssignedToMe > 0 ? 
      Math.round((completedAssignedTasks / tasksAssignedToMe) * 100) : 0;
    
    // Today's tasks (from My Day list and tasks due today)
    const todayTasksList = lists.find(list => list.name === "My Day");
    const todayDueTasks = allTasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate).toDateString() === now.toDateString()
    );
    const todayTasks = (todayTasksList?.tasks?.length || 0) + todayDueTasks.length;
    const completedTodayTasks = [
      ...(todayTasksList?.tasks?.filter(task => task.isCompleted) || []),
      ...todayDueTasks.filter(task => task.isCompleted)
    ].length;
    
    // This week's tasks
    const thisWeekTasks = allTasks.filter(task => 
      task.createdAt && new Date(task.createdAt) >= startOfWeek
    ).length;
    const completedThisWeekTasks = allTasks.filter(task => 
      task.isCompleted && 
      task.createdAt && 
      new Date(task.createdAt) >= startOfWeek
    ).length;
    
    // Average completion time (simplified - using creation to completion)
    const completedTasksWithDates = allTasks.filter(task => 
      task.isCompleted && task.createdAt && task.updatedAt
    );
    const averageCompletionTime = completedTasksWithDates.length > 0 ?
      completedTasksWithDates.reduce((acc, task) => {
        const created = new Date(task.createdAt!).getTime();
        const completed = new Date(task.updatedAt!).getTime();
        return acc + (completed - created);
      }, 0) / completedTasksWithDates.length / (1000 * 60 * 60 * 24) : 0; // Convert to days
    
    // Priority breakdown
    const priorityBreakdown = {
      high: { total: 0, completed: 0 },
      medium: { total: 0, completed: 0 },
      low: { total: 0, completed: 0 }
    };
    
    allTasks.forEach(task => {
      const priority = task.priority || 'medium';
      priorityBreakdown[priority as keyof typeof priorityBreakdown].total++;
      if (task.isCompleted) {
        priorityBreakdown[priority as keyof typeof priorityBreakdown].completed++;
      }
    });
    
    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate,
      tasksAssignedToMe,
      completedAssignedTasks,
      assignedCompletionRate,
      todayTasks,
      completedTodayTasks,
      thisWeekTasks,
      completedThisWeekTasks,
      averageCompletionTime,
      priorityBreakdown
    };
  }, [lists]);

  return (
    <div className="h-full flex flex-col bg-ms-bg dark:bg-gray-900">
      <div className="flex items-center gap-3 p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <BarChart3 className="w-8 h-8 text-red-600" />
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Statistics</h1>
          <p className="text-gray-600 dark:text-gray-400">Your task completion metrics and performance</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedTasks} completed, {stats.pendingTasks} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <Progress value={stats.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdueTasks}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Tasks</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignedCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedAssignedTasks} of {stats.tasksAssignedToMe} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Priority Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.priorityBreakdown).map(([priority, data]) => {
              const rate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
              const colorMap = {
                high: 'bg-red-500',
                medium: 'bg-yellow-500',
                low: 'bg-green-500'
              };
              
              return (
                <div key={priority} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colorMap[priority as keyof typeof colorMap]}`} />
                      <span className="capitalize font-medium">{priority} Priority</span>
                    </div>
                    <Badge variant="secondary">{rate}%</Badge>
                  </div>
                  <Progress value={rate} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {data.completed} of {data.total} completed
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Time-based Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Time-based Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Today</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{stats.completedTodayTasks}/{stats.todayTasks}</span>
                <Badge variant="outline">
                  {stats.todayTasks > 0 ? Math.round((stats.completedTodayTasks / stats.todayTasks) * 100) : 0}%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">This Week</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{stats.completedThisWeekTasks}/{stats.thisWeekTasks}</span>
                <Badge variant="outline">
                  {stats.thisWeekTasks > 0 ? Math.round((stats.completedThisWeekTasks / stats.thisWeekTasks) * 100) : 0}%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Avg. Completion Time</span>
              <Badge variant="secondary">
                {stats.averageCompletionTime > 0 ? `${Math.round(stats.averageCompletionTime)} days` : 'N/A'}
              </Badge>
            </div>
            
            <div className="pt-4 border-t">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.completionRate}%</div>
                <p className="text-sm text-muted-foreground">Overall completion rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.completedTasks} tasks completed out of {stats.totalTasks} total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">Strengths</span>
              </div>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                {stats.completionRate >= 80 && <li>• High completion rate</li>}
                {stats.overdueTasks === 0 && <li>• No overdue tasks</li>}
                {stats.assignedCompletionRate >= 90 && <li>• Excellent on assigned tasks</li>}
                {stats.completionRate < 80 && stats.overdueTasks > 0 && stats.assignedCompletionRate < 90 && (
                  <li>• Keep up the good work!</li>
                )}
              </ul>
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800 dark:text-yellow-200">Areas to Improve</span>
              </div>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                {stats.overdueTasks > 0 && <li>• {stats.overdueTasks} overdue tasks</li>}
                {stats.completionRate < 80 && <li>• Completion rate below 80%</li>}
                {stats.assignedCompletionRate < 90 && <li>• Focus on assigned tasks</li>}
                {stats.overdueTasks === 0 && stats.completionRate >= 80 && stats.assignedCompletionRate >= 90 && (
                  <li>• You're doing great!</li>
                )}
              </ul>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800 dark:text-blue-200">Recommendations</span>
              </div>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                {stats.overdueTasks > 0 && <li>• Review overdue tasks first</li>}
                {stats.todayTasks > stats.completedTodayTasks && <li>• Focus on today's tasks</li>}
                <li>• Set realistic due dates</li>
                <li>• Break large tasks into smaller ones</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}