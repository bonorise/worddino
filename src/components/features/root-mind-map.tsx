"use client";

import { useMemo } from "react";
import dagre from "dagre";
import { useRouter } from "next/navigation";
import {
  Background,
  Controls,
  Edge,
  MiniMap,
  Node,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocalizedText } from "@/lib/i18n/content";
import type { LocaleCode, WordDetail } from "@/lib/types";

interface RootMindMapProps {
  locale: LocaleCode;
  title: string;
  hint: string;
  word: WordDetail;
}

interface WordNodeData {
  label: string;
  slug?: string;
  kind: "root" | "word";
  highlighted?: boolean;
}

function layoutGraph(nodes: Node<WordNodeData>[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "TB", ranksep: 48, nodesep: 30 });

  for (const node of nodes) {
    dagreGraph.setNode(node.id, { width: 150, height: 44 });
  }
  for (const edge of edges) {
    dagreGraph.setEdge(edge.source, edge.target);
  }

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const position = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: position.x - 75,
        y: position.y - 22,
      },
    };
  });
}

function RootMindMapInner({ locale, title, hint, word }: RootMindMapProps) {
  const router = useRouter();

  const { nodes, edges } = useMemo(() => {
    const rootText = word.morphemes.find((item) => item.kind === "root")?.text ?? word.slug;
    const rootId = `root-${rootText}`;
    const candidateWords = new Map<string, { label: string; gloss: string }>();

    candidateWords.set(word.slug, {
      label: word.display,
      gloss: getLocalizedText(word.gloss, locale),
    });

    for (const familyItem of word.family) {
      const slug = familyItem.word.toLowerCase();
      if (!candidateWords.has(slug)) {
        candidateWords.set(slug, {
          label: familyItem.word,
          gloss: getLocalizedText(familyItem.gloss, locale),
        });
      }
    }

    const nodesBase: Node<WordNodeData>[] = [
      {
        id: rootId,
        position: { x: 0, y: 0 },
        data: { label: rootText, kind: "root" },
        style: {
          background: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          border: "none",
          borderRadius: "12px",
          width: 150,
          textAlign: "center",
          fontWeight: 700,
        },
      },
      ...Array.from(candidateWords.entries()).map(([slug, value]) => ({
        id: slug,
        position: { x: 0, y: 0 },
        data: {
          label: value.label,
          slug,
          kind: "word",
          highlighted: slug === word.slug,
        },
        style: {
          background: slug === word.slug ? "rgba(35,99,84,0.16)" : "hsl(var(--card))",
          color: "hsl(var(--foreground))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "12px",
          width: 150,
          textAlign: "center",
        },
      })),
    ];

    const edgesBase: Edge[] = Array.from(candidateWords.keys()).map((slug) => ({
      id: `${rootId}-${slug}`,
      source: rootId,
      target: slug,
      animated: slug === word.slug,
      style: {
        stroke: slug === word.slug ? "#166534" : "#64748b",
      },
    }));

    return {
      nodes: layoutGraph(nodesBase, edgesBase),
      edges: edgesBase,
    };
  }, [locale, word]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardHeader>
      <CardContent>
        <div className="h-[420px] w-full overflow-hidden rounded-xl border border-border">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            minZoom={0.4}
            maxZoom={1.8}
            onNodeClick={(_, node) => {
              if (node.data.kind === "word" && node.data.slug) {
                router.push(`/${locale}/word/${node.data.slug}`);
              }
            }}
          >
            <Background />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
}

export function RootMindMap(props: RootMindMapProps) {
  return (
    <ReactFlowProvider>
      <RootMindMapInner {...props} />
    </ReactFlowProvider>
  );
}
