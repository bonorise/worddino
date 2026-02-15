"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LocaleCode, VoteValue, WordDetail } from "@/lib/types";

interface WordHeaderProps {
  locale: LocaleCode;
  word: WordDetail;
  labels: {
    speak: string;
    voteUp: string;
    voteDown: string;
  };
}

export function WordHeader({ locale, word, labels }: WordHeaderProps) {
  const [up, setUp] = useState(word.voteUp);
  const [down, setDown] = useState(word.voteDown);
  const [userVote, setUserVote] = useState<VoteValue | 0>(word.userVote);

  const onSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(word.display);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const onVote = async (value: VoteValue) => {
    try {
      const response = await fetch(`/api/word/${word.slug}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value }),
      });

      if (!response.ok) {
        throw new Error("vote request failed");
      }

      const data = (await response.json()) as {
        up: number;
        down: number;
        userVote: VoteValue;
      };
      setUp(data.up);
      setDown(data.down);
      setUserVote(data.userVote);
    } catch {
      toast.error(locale === "zh-CN" ? "投票失败，请稍后重试" : "Vote failed, try again later");
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="font-serif text-3xl font-semibold md:text-4xl">{word.display}</h1>
          <div className="flex items-center gap-2">
            {word.ipa ? <Badge variant="outline">/{word.ipa}/</Badge> : null}
            {word.pos ? <Badge variant="secondary">{word.pos}</Badge> : null}
          </div>
        </div>
        <Button variant="outline" onClick={onSpeak}>
          <Volume2 className="h-4 w-4" />
          {labels.speak}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={userVote === 1 ? "default" : "outline"}
          size="sm"
          onClick={() => onVote(1)}
        >
          <ThumbsUp className="h-4 w-4" />
          {labels.voteUp} ({up})
        </Button>
        <Button
          variant={userVote === -1 ? "default" : "outline"}
          size="sm"
          onClick={() => onVote(-1)}
        >
          <ThumbsDown className="h-4 w-4" />
          {labels.voteDown} ({down})
        </Button>
      </div>
    </div>
  );
}
