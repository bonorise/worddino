"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WordGeneratingProps {
  slug: string;
  generatingText: string;
  retryText: string;
}

const POLL_INTERVAL = 1500;

export function WordGenerating({ slug, generatingText, retryText }: WordGeneratingProps) {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [requestId, setRequestId] = useState(0);

  const generatePath = useMemo(() => `/api/word/${slug}/generate`, [slug]);
  const detailPath = useMemo(() => `/api/word/${slug}`, [slug]);

  useEffect(() => {
    let isUnmounted = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      try {
        setError(false);
        await fetch(generatePath, { method: "POST" });
        timer = setInterval(async () => {
          const response = await fetch(detailPath, { method: "GET", cache: "no-store" });
          if (!response.ok) {
            return;
          }
          const data = (await response.json()) as { status: string };
          if (data.status === "ready") {
            if (timer) {
              clearInterval(timer);
            }
            if (!isUnmounted) {
              router.refresh();
            }
          }
        }, POLL_INTERVAL);
      } catch {
        if (!isUnmounted) {
          setError(true);
        }
      }
    };

    run();

    return () => {
      isUnmounted = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [detailPath, generatePath, requestId, router]);

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          {generatingText}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <Button variant="outline" onClick={() => setRequestId((value) => value + 1)}>
            {retryText}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
