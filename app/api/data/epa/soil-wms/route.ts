import { NextResponse } from "next/server";

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axXl9sAAAAASUVORK5CYII=",
  "base64",
);

function getParam(
  searchParams: URLSearchParams,
  key: string,
  fallback: string,
) {
  const value = searchParams.get(key);
  return value?.trim() ? value : fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bbox = getParam(
    searchParams,
    "bbox",
    "-1170000,6200000,-450000,7600000",
  );
  const width = getParam(searchParams, "width", "256");
  const height = getParam(searchParams, "height", "256");

  const upstream = new URL("https://gis.epa.ie/geoserver/wms");
  upstream.searchParams.set("service", "WMS");
  upstream.searchParams.set("version", "1.1.1");
  upstream.searchParams.set("request", "GetMap");
  upstream.searchParams.set("layers", "EPA:SOIL_SISNationalSoils");
  upstream.searchParams.set("styles", "");
  upstream.searchParams.set("bbox", bbox);
  upstream.searchParams.set("width", width);
  upstream.searchParams.set("height", height);
  upstream.searchParams.set("srs", "EPSG:3857");
  upstream.searchParams.set("format", "image/png");
  upstream.searchParams.set("transparent", "true");

  try {
    const response = await fetch(upstream.toString(), {
      cache: "no-store",
      headers: {
        "User-Agent": "farm-dashboard/0.1",
      },
    });

    if (!response.ok) {
      return new NextResponse(TRANSPARENT_PNG, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new NextResponse(TRANSPARENT_PNG, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60",
      },
    });
  }
}
