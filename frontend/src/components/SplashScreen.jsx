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

      <div className="flex flex-col items-center justify-center space-y-8 max-w-md w-full">
        {/* Welcome Message */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-white">Welcome to Nexora LMS</h2>
          <p className="text-gray-300 text-lg">
            Your learning management system for students, teachers, and administrators
          </p>
        </div>

        {/* Single Login Card */}
        <Card className="hover:scale-105 transition-transform duration-300 shadow-lg w-full">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#dc2626] to-[#b91c1c] rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Get Started</CardTitle>
            <CardDescription>Login to access your personalized dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => onSelectRole(null, "login")}
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
