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

type AnalyticsErrorProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

export default function AnalyticsError({ error, reset }: AnalyticsErrorProps) {
    useEffect(() => {
        // Keep visible logging for now; this is where Sentry/Datadog capture can be added later.
        console.error("Analytics module error:", error);
    }, [error]);

    return (
        <div className="p-4 sm:p-6">
            <Card className="mx-auto max-w-2xl border-l-4 border-l-red-500">
                <CardHeader>
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        <CardTitle>Something Went Wrong</CardTitle>
                    </div>
                    <CardDescription>
                        Analytics failed to load due to an unexpected issue. You are still in the
                        same module, and you can retry safely.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600">
                        If this keeps happening, please share the issue ID with the team.
                    </p>

                    {process.env.NODE_ENV !== "production" && (
                        <div className="rounded-md border bg-slate-50 p-3 text-xs text-slate-700">
                            <p className="font-medium">Debug details</p>
                            <p className="mt-1 break-all">{error.message || "Unknown error"}</p>
                            {error.digest && <p className="mt-1">Issue ID: {error.digest}</p>}
                        </div>
                    )}
                </CardContent>

                <CardFooter>
                    <Button type="button" onClick={() => reset()} className="inline-flex items-center gap-2">
                        <RefreshCcw className="h-4 w-4" />
                        Try Again
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
