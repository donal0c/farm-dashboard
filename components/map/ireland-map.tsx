"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import MapView, {
  Layer,
  Marker,
  NavigationControl,
  Source,
} from "react-map-gl/maplibre";

import { farmMapColors, farmMapColorsDark } from "@/lib/map/style";
import { useFarmMapStyle } from "@/lib/map/use-farm-map-style";

type LatLng = { latitude: number; longitude: number };

type IrelandMapProps = {
  center: LatLng;
  onPickLocation: (location: LatLng) => void;
  onSelectParcel?: (parcelId: string) => void;
  lpisGeoJson?: GeoJSON.FeatureCollection;
  pickLocation?: boolean;
  selectedParcelId?: string | null;
  showSoilLayer: boolean;
  candidate?: LatLng | null;
};

const soilTiles =
  "/api/data/epa/soil-wms?bbox={bbox-epsg-3857}&width=256&height=256";

export function IrelandMap({
  center,
  onPickLocation,
  onSelectParcel,
  lpisGeoJson,
  pickLocation = false,
  selectedParcelId,
  showSoilLayer,
  candidate,
}: IrelandMapProps) {
  const { resolvedTheme } = useTheme();
  const mapStyle = useFarmMapStyle(resolvedTheme);
  const colors = resolvedTheme === "dark" ? farmMapColorsDark : farmMapColors;
  const [viewState, setViewState] = useState({
    longitude: center.longitude,
    latitude: center.latitude,
    zoom: 12.5,
  });

  useEffect(() => {
    setViewState((current) => ({
      ...current,
      longitude: center.longitude,
      latitude: center.latitude,
    }));
  }, [center.latitude, center.longitude]);

  return (
    <div
      className="relative h-[460px] w-full overflow-hidden rounded-lg border border-rule bg-muted"
      data-selected-parcel-id={selectedParcelId ?? ""}
    >
      <MapView
        cooperativeGestures
        cursor={pickLocation ? "crosshair" : "grab"}
        interactiveLayerIds={
          lpisGeoJson && !pickLocation ? ["lpis-fill"] : undefined
        }
        mapStyle={mapStyle}
        {...viewState}
        maxBounds={[
          [-11.2, 51],
          [-5, 55.9],
        ]}
        attributionControl={{ compact: true }}
        onMove={(event) => {
          setViewState(event.viewState);
        }}
        onClick={(event) => {
          if (pickLocation) {
            onPickLocation({
              longitude: event.lngLat.lng,
              latitude: event.lngLat.lat,
            });
            return;
          }

          const parcelId = event.features?.[0]?.properties?.parcelId;
          if (typeof parcelId === "string") onSelectParcel?.(parcelId);
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {showSoilLayer ? (
          <Source
            id="soil-wms"
            type="raster"
            tiles={[soilTiles]}
            tileSize={256}
          >
            <Layer
              id="soil-wms-layer"
              type="raster"
              paint={{ "raster-opacity": 0.32 }}
            />
          </Source>
        ) : null}

        {lpisGeoJson ? (
          <Source id="lpis" type="geojson" data={lpisGeoJson}>
            <Layer
              id="lpis-fill"
              type="fill"
              paint={{
                "fill-color": colors.parcelFill,
                "fill-opacity": 0.22,
              }}
            />
            <Layer
              id="lpis-outline"
              type="line"
              paint={{
                "line-color": colors.parcelLine,
                "line-width": 1.4,
              }}
            />
            {selectedParcelId ? (
              <Layer
                id="lpis-selected-fill"
                type="fill"
                filter={["==", ["get", "parcelId"], selectedParcelId]}
                paint={{
                  "fill-color": colors.parcelLine,
                  "fill-opacity": 0.34,
                }}
              />
            ) : null}
            {selectedParcelId ? (
              <Layer
                id="lpis-selected-outline"
                type="line"
                filter={["==", ["get", "parcelId"], selectedParcelId]}
                paint={{
                  "line-color": colors.parcelLine,
                  "line-width": 3.2,
                }}
              />
            ) : null}
          </Source>
        ) : null}

        <Marker
          longitude={center.longitude}
          latitude={center.latitude}
          anchor="center"
          style={{ pointerEvents: "none" }}
        >
          <span
            className="block h-4 w-4 rounded-full border-[3px] border-sheet bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
            role="img"
            aria-label={candidate ? "Candidate farm point" : "Saved farm point"}
          />
        </Marker>
      </MapView>
      {pickLocation ? (
        <p className="pointer-events-none absolute left-3 top-3 rounded-md bg-sheet/95 px-3 py-1.5 text-xs font-semibold shadow-sheet">
          Click the map to choose a candidate point
        </p>
      ) : null}
    </div>
  );
}
