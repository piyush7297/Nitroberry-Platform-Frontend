"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-2xl mx-auto text-center">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="inline-block mb-4">
              <h1 className="text-[80px] sm:text-[100px] md:text-[120px] font-extrabold text-gray-800 leading-none">
                4<span className="text-[#7F56D9]">0</span>4
              </h1>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Page Not Found
            </h2>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
              We lost this page. The page you are looking for doesn't exist or
              has been moved.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex-1 sm:flex-initial border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              size="lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go back
            </Button>

            <Button
              variant="default"
              onClick={() => router.push("/dashboard")}
              className="flex-1 sm:flex-initial bg-[#7F56D9] hover:bg-[#7F56D9]/90 text-white"
              size="lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
