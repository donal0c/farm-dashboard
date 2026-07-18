"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import MapView, { Layer, Marker, Source } from "react-map-gl/maplibre";
import { farmMapColors, farmMapStyles } from "@/lib/map/style";

type LatLng = { latitude: number; longitude: number };

type IrelandMapProps = {
  center: LatLng;
  onPickLocation: (location: LatLng) => void;
  onSelectParcel?: (parcelId: string) => void;
  lpisGeoJson?: GeoJSON.FeatureCollection;
  pickLocation?: boolean;
  selectedParcelId?: string | null;
  showSoilLayer: boolean;
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
}: IrelandMapProps) {
  const { resolvedTheme } = useTheme();
  const [viewState, setViewState] = useState({
    longitude: center.longitude,
    latitude: center.latitude,
    zoom: 10,
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
      className="h-[460px] w-full overflow-hidden rounded-lg border border-border"
      data-selected-parcel-id={selectedParcelId ?? ""}
    >
      <MapView
        cooperativeGestures
        cursor={pickLocation ? "crosshair" : "grab"}
        interactiveLayerIds={
          lpisGeoJson && !pickLocation ? ["lpis-fill"] : undefined
        }
        mapStyle={
          resolvedTheme === "dark" ? farmMapStyles.dark : farmMapStyles.light
        }
        {...viewState}
        maxBounds={[
          [-11.2, 51],
          [-5, 55.9],
        ]}
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
        <Marker
          longitude={center.longitude}
          latitude={center.latitude}
          anchor="bottom"
        >
          <span
            className="block h-4 w-4 rounded-full border-[3px] border-card bg-primary shadow-md"
            role="img"
            aria-label="Saved farm point"
          />
        </Marker>
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
              paint={{ "raster-opacity": 0.28 }}
            />
          </Source>
        ) : null}

        {lpisGeoJson ? (
          <Source id="lpis" type="geojson" data={lpisGeoJson}>
            <Layer
              id="lpis-fill"
              type="fill"
              paint={{
                "fill-color": farmMapColors.parcelFill,
                "fill-opacity": 0.25,
              }}
            />
            <Layer
              id="lpis-outline"
              type="line"
              paint={{
                "line-color": farmMapColors.parcelLine,
                "line-width": 1.5,
              }}
            />
            {selectedParcelId ? (
              <Layer
                id="lpis-selected-fill"
                type="fill"
                filter={["==", ["get", "parcelId"], selectedParcelId]}
                paint={{
                  "fill-color": farmMapColors.parcelLine,
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
                  "line-color": farmMapColors.parcelLine,
                  "line-width": 3.5,
                }}
              />
            ) : null}
          </Source>
        ) : null}
      </MapView>
    </div>
  );
}
