import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { GraduationCap, BookOpen, Shield } from "lucide-react"; // Shield icon for admin
import logoImage from "../assets/e43b99fbf3daf7ef0b4379bee2be48bce749b881.png";

export default function SplashScreen({ onSelectRole }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#374151] to-[#dc2626] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <div className="flex items-center gap-2">
          <img src={logoImage} alt="Nexora Logo" className="w-10 h-10 object-contain" />
          <h1 className="text-white text-3xl font-bold tracking-tight">Nexora</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
        {/* Student Card */}
        <Card className="hover:scale-105 transition-transform duration-300 shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#dc2626] to-[#b91c1c] rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Student</CardTitle>
            <CardDescription>Access your courses, assignments, and grades</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => onSelectRole("student", "login")}
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              Login as Student
            </Button>
          </CardContent>
        </Card>

        {/* Teacher Card */}
        <Card className="hover:scale-105 transition-transform duration-300 shadow-lg bg-[#374151] text-white border-[#374151]">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#dc2626] to-[#b91c1c] rounded-full flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Teacher</CardTitle>
            <CardDescription className="text-gray-300">
              Manage courses, create content, and track progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              onClick={() => onSelectRole("teacher", "login")}
            >
              Login as Teacher
            </Button>
          </CardContent>
        </Card>

        {/* Admin Card */}
        <Card className="hover:scale-105 transition-transform duration-300 shadow-lg bg-[#1f2937] text-white border-[#1f2937]">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#dc2626] to-[#b91c1c] rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Admin</CardTitle>
            <CardDescription className="text-gray-300">
              Manage users, subjects, and sections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
              onClick={() => onSelectRole("admin", "login")}
            >
              Login as Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
