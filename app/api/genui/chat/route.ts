import { NextResponse } from "next/server";

import type { GenUiChatResponse, GenUiToolCall } from "@/lib/genui/types";

function generateToolCalls(prompt: string): GenUiToolCall[] {
  const lower = prompt.toLowerCase();
  const calls: GenUiToolCall[] = [];

  if (/(market|income|price|trend|chart)/.test(lower)) {
    calls.push({
      tool: "showBarChart",
      payload: {
        title: "AI: Market Snapshot",
        labels: ["Cattle", "Milk", "Sheep", "Crops"],
        values: [118, 122, 103, 111],
      },
    });
  }

  if (/(compliance|status|table|county|cap)/.test(lower)) {
    calls.push({
      tool: "showDataTable",
      payload: {
        title: "AI: Compliance Table",
        columns: ["County", "Good/High %", "Records"],
        rows: [
          ["Cork", 74, 420],
          ["Galway", 68, 389],
          ["Mayo", 71, 361],
        ],
      },
    });
  }

  if (/(map|where|location|field|parcel)/.test(lower)) {
    calls.push({
      tool: "showMap",
      payload: {
        title: "AI: Suggested Focus Area",
        latitude: 53.35,
        longitude: -6.26,
      },
    });
  }

  if (/(parcel|field|crop)/.test(lower)) {
    calls.push({
      tool: "showParcelInfo",
      payload: {
        title: "AI: Parcel Insight",
        parcelId: "P-2026-0142",
        cropType: "Permanent Pasture",
        areaHa: 8.42,
        tenure: "Owned",
      },
    });
  }

  return calls;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string };
  const prompt = (body.prompt ?? "").trim();

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const toolCalls = generateToolCalls(prompt);

  const reply = toolCalls.length
    ? "I generated components based on your request. You can refine with more specific filters (region, year, station)."
    : "I can generate charts, tables, map focuses, and parcel insights. Try asking for one explicitly.";

  const response: GenUiChatResponse = {
    reply,
    toolCalls,
  };

  return NextResponse.json(response);
}
