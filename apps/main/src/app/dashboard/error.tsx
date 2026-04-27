"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

type DashboardErrorProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
    useEffect(() => {
        // Keep visible logging for now; this is where Sentry/Datadog capture can be added later.
        console.error("Dashboard error:", error);
    }, [error]);

    return (
        <div className="flex items-center justify-center p-4 sm:p-20 min-h-[60vh]">
            <Card className="mx-auto max-w-2xl border-l-4 border-l-red-500 shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        <CardTitle>Oops! Something Went Wrong</CardTitle>
                    </div>
                    <CardDescription>
                        An unexpected error occurred while loading this section. You can try to refresh the content or contact support if the issue persists.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600 font-medium">
                        What happened?
                    </p>
                    <p className="text-sm text-gray-500 italic pb-2">
                        {error.message || "An unknown technical error occurred."}
                    </p>

                    {process.env.NODE_ENV !== "production" && (
                        <div className="rounded-md border bg-slate-50 p-3 text-xs text-slate-700 font-mono">
                            <p className="font-bold border-b pb-1 mb-2">Debug Details (Dev Only)</p>
                            <p className="mt-1 break-all">{error.stack || error.message}</p>
                            {error.digest && <p className="mt-2 text-blue-600 font-bold">Issue ID: {error.digest}</p>}
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex gap-3 justify-end pt-2">
                     <Button 
                        type="button" 
                        variant="ghost"
                        onClick={() => window.location.href = "/dashboard"} 
                        className="text-gray-600"
                    >
                        Go to Home
                    </Button>
                    <Button 
                        type="button" 
                        onClick={() => reset()} 
                        className="inline-flex items-center gap-2"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Retry Now
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
