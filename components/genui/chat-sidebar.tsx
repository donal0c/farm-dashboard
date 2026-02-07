"use client";

import ReactECharts from "echarts-for-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GenUiChatResponse, GenUiToolCall } from "@/lib/genui/types";

type Message = {
  role: "user" | "assistant";
  text: string;
};

function ToolRender({ toolCall }: { toolCall: GenUiToolCall }) {
  if (toolCall.tool === "showBarChart") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{toolCall.payload.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReactECharts
            style={{ height: 220 }}
            option={{
              xAxis: { type: "category", data: toolCall.payload.labels },
              yAxis: { type: "value" },
              series: [{ type: "bar", data: toolCall.payload.values }],
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (toolCall.tool === "showDataTable") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{toolCall.payload.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {toolCall.payload.columns.map((column) => (
                  <th
                    key={column}
                    className="border-b border-border px-2 py-1 text-left"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {toolCall.payload.rows.map((row, index) => (
                <tr key={`${row[0]}-${index}`}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${toolCall.payload.columns[cellIndex]}-${String(cell)}`}
                      className="border-b border-border px-2 py-1"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    );
  }

  if (toolCall.tool === "showMap") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{toolCall.payload.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          Focus latitude: {toolCall.payload.latitude}, longitude:{" "}
          {toolCall.payload.longitude}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{toolCall.payload.title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <p>Parcel: {toolCall.payload.parcelId}</p>
        <p>Crop: {toolCall.payload.cropType}</p>
        <p>Area: {toolCall.payload.areaHa} ha</p>
        <p>Tenure: {toolCall.payload.tenure}</p>
      </CardContent>
    </Card>
  );
}

export function ChatSidebar() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolCalls, setToolCalls] = useState<GenUiToolCall[]>([]);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const input = prompt.trim();
    if (!input || loading) return;

    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: input }]);
    setPrompt("");

    try {
      const response = await fetch("/api/genui/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });

      if (!response.ok) {
        throw new Error("chat failed");
      }

      const payload = (await response.json()) as GenUiChatResponse;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: payload.reply },
      ]);
      setToolCalls((prev) => [...payload.toolCalls, ...prev].slice(0, 8));
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="h-full border-l border-border bg-card/40 p-3">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">AI Sidebar (GenUI)</h2>
        <p className="text-xs text-muted-foreground">
          Ask for charts, tables, map focus, or parcel insights.
        </p>
      </div>

      <div className="mb-3 grid gap-2">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="min-h-20 rounded-md border border-input bg-background p-2 text-sm"
          placeholder="Example: Show me a compliance table for top counties"
        />
        <Button onClick={onSubmit} disabled={loading}>
          {loading ? "Generating..." : "Send"}
        </Button>
      </div>

      <div className="mb-3 grid max-h-48 gap-2 overflow-y-auto pr-1">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className="rounded-md border border-border p-2 text-xs"
          >
            <p className="font-medium">
              {message.role === "user" ? "You" : "AI"}
            </p>
            <p>{message.text}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2">
        {toolCalls.map((toolCall, index) => (
          <ToolRender key={`${toolCall.tool}-${index}`} toolCall={toolCall} />
        ))}
      </div>
    </aside>
  );
}
