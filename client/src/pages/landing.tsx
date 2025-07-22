import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Users, Share2, Target, Calendar, Bell, Monitor, Smartphone, Moon } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  
  const handleLogin = () => {
    window.location.href = "/auth";
  };

  const handleSignUp = () => {
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-start mb-16">
          {/* Left Side - View Mode Toggle and Dark Mode */}
          <div className="flex flex-col items-start gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant={viewMode === "desktop" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("desktop")}
                className="h-8 px-3"
              >
                <Monitor className="w-4 h-4 mr-1" />
                Desktop
              </Button>
              <Button
                variant={viewMode === "mobile" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("mobile")}
                className="h-8 px-3"
              >
                <Smartphone className="w-4 h-4 mr-1" />
                Mobile
              </Button>
            </div>
            {/* Dark Mode Toggle - Below Desktop/Mobile */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const isDark = document.documentElement.classList.contains('dark');
                  if (isDark) {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                  } else {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                  }
                }}
                className="h-8 px-3"
              >
                <Moon className="h-4 w-4 mr-1" />
                Dark Mode
              </Button>
            </div>
          </div>

          {/* Center Logo */}
          <div className="flex items-center space-x-4">
            <CheckCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">FlowPilot</h1>
          </div>
          
          {/* Sign In and Sign Up Buttons - Top Right */}
          <div className="flex items-center gap-3">
            <Button onClick={handleLogin} variant="outline" size="lg">
              Sign In
            </Button>
            <Button onClick={handleSignUp} size="lg">
              Sign Up
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6">
            <span className="text-black">Organize Your Life with </span>
            <span className="text-blue-600 dark:text-blue-400">FlowPilot</span>
          </h1>
          <p className="text-xl text-ms-text-secondary mb-8 max-w-2xl mx-auto">
            A comprehensive to-do list application with family sharing, custom lists, 
            and task assignment features. Stay organized, stay connected.
          </p>
          <Button onClick={handleLogin} size="lg" className="px-8 py-4 text-lg">
            Get Started Free
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Family Collaboration</CardTitle>
              <CardDescription>
                Create family groups with up to 8 members and assign tasks to specific people.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Share2 className="h-12 w-12 text-primary mb-4" />
              <CardTitle>List Sharing</CardTitle>
              <CardDescription>
                Share your lists with family and friends. Control permissions for viewing and editing.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Target className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Custom Lists</CardTitle>
              <CardDescription>
                Create unlimited custom lists for different goals: short-term, long-term, or anything you need.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Due Dates & Reminders</CardTitle>
              <CardDescription>
                Set due dates for your tasks and never miss important deadlines again.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Subtasks</CardTitle>
              <CardDescription>
                Break down complex tasks into manageable subtasks for better organization.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Bell className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Real-time Updates</CardTitle>
              <CardDescription>
                See changes instantly when family members update shared tasks and lists.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-primary/5 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-ms-text mb-4">
            Ready to Get Organized?
          </h2>
          <p className="text-lg text-ms-text-secondary mb-8">
            Join thousands of families who trust FlowPilot to keep their lives organized.
          </p>
          <Button onClick={handleLogin} size="lg" className="px-8 py-4 text-lg">
            Start Your Journey Today
          </Button>
        </div>
      </div>
    </div>
  );
}
