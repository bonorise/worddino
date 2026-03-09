"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  Controls,
  type Edge,
  MarkerType,
  type Node,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocaleCode } from "@/lib/types";

interface WordFamilyGraphProps {
  locale: LocaleCode;
  title: string;
  hint: string;
  empty: string;
  word: string;
  familyWords: string[];
}

interface FamilyNodeData extends Record<string, unknown> {
  label: string;
  slug: string;
  current?: boolean;
}

function buildGraph(word: string, familyWords: string[]) {
  const uniqueWords = Array.from(
    new Set(
      familyWords
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0 && item !== word),
    ),
  ).slice(0, 10);

  const centerId = `word:${word}`;
  const nodes: Node<FamilyNodeData>[] = [
    {
      id: centerId,
      position: { x: 220, y: 150 },
      data: {
        label: word,
        slug: word,
        current: true,
      },
      style: {
        background: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
        border: "none",
        borderRadius: "14px",
        width: 150,
        textAlign: "center",
        fontWeight: 700,
      },
    },
  ];

  const edges: Edge[] = [];
  const radiusX = 180;
  const radiusY = 120;

  uniqueWords.forEach((item, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(uniqueWords.length, 1);
    const x = 220 + Math.cos(angle) * radiusX;
    const y = 150 + Math.sin(angle) * radiusY;
    const nodeId = `family:${item}`;

    nodes.push({
      id: nodeId,
      position: { x, y },
      data: {
        label: item,
        slug: item,
      },
      style: {
        background: "hsl(var(--card))",
        color: "hsl(var(--foreground))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "12px",
        width: 140,
        textAlign: "center",
      },
    });

    edges.push({
      id: `${centerId}->${nodeId}`,
      source: centerId,
      target: nodeId,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#5b6b62",
      },
      style: {
        stroke: "#5b6b62",
        strokeWidth: 1.2,
      },
    });
  });

  return { nodes, edges };
}

function WordFamilyGraphInner({
  locale,
  title,
  hint,
  empty,
  word,
  familyWords,
}: WordFamilyGraphProps) {
  const router = useRouter();
  const graph = useMemo(() => buildGraph(word, familyWords), [familyWords, word]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardHeader>
      <CardContent>
        {graph.nodes.length <= 1 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="h-[360px] overflow-hidden rounded-xl border border-border">
            <ReactFlow
              nodes={graph.nodes}
              edges={graph.edges}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.5}
              maxZoom={1.8}
              onNodeClick={(_, node) => {
                const slug = node.data.slug;
                if (slug && slug !== word) {
                  router.push(`/${locale}/word/${slug}`);
                }
              }}
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WordFamilyGraph(props: WordFamilyGraphProps) {
  return (
    <ReactFlowProvider>
      <WordFamilyGraphInner {...props} />
    </ReactFlowProvider>
  );
}
