"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useState } from "react";
import MapView, { Layer, Marker, Source } from "react-map-gl/maplibre";
import { farmMapColors, farmMapStyle } from "@/lib/map/style";

type LatLng = { latitude: number; longitude: number };

type IrelandMapProps = {
  center: LatLng;
  onPickLocation: (location: LatLng) => void;
  lpisGeoJson?: GeoJSON.FeatureCollection;
  nitratesGeoJson?: GeoJSON.FeatureCollection;
  showSoilLayer: boolean;
  showNitrateLayer: boolean;
};

const soilTiles =
  "/api/data/epa/soil-wms?bbox={bbox-epsg-3857}&width=256&height=256";

export function IrelandMap({
  center,
  onPickLocation,
  lpisGeoJson,
  nitratesGeoJson,
  showSoilLayer,
  showNitrateLayer,
}: IrelandMapProps) {
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
    <div className="h-[420px] w-full overflow-hidden rounded-lg border border-border">
      <MapView
        mapStyle={farmMapStyle}
        {...viewState}
        maxBounds={[
          [-11.2, 51],
          [-5, 55.9],
        ]}
        onMove={(event) => {
          setViewState(event.viewState);
        }}
        onClick={(event) => {
          onPickLocation({
            longitude: event.lngLat.lng,
            latitude: event.lngLat.lat,
          });
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
          </Source>
        ) : null}

        {showNitrateLayer && nitratesGeoJson ? (
          <Source id="nitrates" type="geojson" data={nitratesGeoJson}>
            <Layer
              id="nitrate-fill"
              type="fill"
              paint={{
                "fill-color": farmMapColors.nitrateFill,
                "fill-opacity": 0.2,
              }}
            />
            <Layer
              id="nitrate-outline"
              type="line"
              paint={{
                "line-color": farmMapColors.nitrateLine,
                "line-width": 1.5,
              }}
            />
          </Source>
        ) : null}
      </MapView>
    </div>
  );
}
