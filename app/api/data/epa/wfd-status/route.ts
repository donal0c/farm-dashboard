import { NextResponse } from "next/server";

function buildWfsUrl(layer: string, bbox: string) {
  const url = new URL("https://gis.epa.ie/geoserver/wfs");
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "1.1.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typeName", layer);
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("srsName", "EPSG:4326");
  url.searchParams.set("bbox", `${bbox},EPSG:4326`);
  url.searchParams.set("maxFeatures", "300");
  return url;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number.parseFloat(searchParams.get("lat") ?? "53.5");
  const lng = Number.parseFloat(searchParams.get("lng") ?? "-7.5");
  const radius = Number.parseFloat(searchParams.get("radius") ?? "1.0");

  const minLng = lng - radius;
  const minLat = lat - radius;
  const maxLng = lng + radius;
  const maxLat = lat + radius;
  const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;

  const riverUrl = buildWfsUrl("EPA:WFD_RWBStatus_20192024", bbox);
  const groundUrl = buildWfsUrl("EPA:WFD_GWBStatus_20192024", bbox);

  const [riverResponse, groundResponse] = await Promise.all([
    fetch(riverUrl, { cache: "no-store" }),
    fetch(groundUrl, { cache: "no-store" }),
  ]);

  if (!riverResponse.ok || !groundResponse.ok) {
    return NextResponse.json(
      { error: "wfd status upstream failed" },
      { status: 502 },
    );
  }

  const [rivers, groundwater] = await Promise.all([
    riverResponse.json(),
    groundResponse.json(),
  ]);

  return NextResponse.json({ rivers, groundwater });
}
