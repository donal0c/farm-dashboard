"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useState } from "react";
import MapView, { Layer, Source } from "react-map-gl/maplibre";

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
  "https://gis.epa.ie/geoserver/wms?service=WMS&version=1.1.1&request=GetMap&layers=EPA:SOIL_SISNationalSoils&styles=&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true";

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
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        {...viewState}
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
              paint={{ "raster-opacity": 0.45 }}
            />
          </Source>
        ) : null}

        {lpisGeoJson ? (
          <Source id="lpis" type="geojson" data={lpisGeoJson}>
            <Layer
              id="lpis-fill"
              type="fill"
              paint={{
                "fill-color": "#22c55e",
                "fill-opacity": 0.25,
              }}
            />
            <Layer
              id="lpis-outline"
              type="line"
              paint={{
                "line-color": "#15803d",
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
                "fill-color": "#f59e0b",
                "fill-opacity": 0.2,
              }}
            />
            <Layer
              id="nitrate-outline"
              type="line"
              paint={{
                "line-color": "#b45309",
                "line-width": 1.5,
              }}
            />
          </Source>
        ) : null}
      </MapView>
    </div>
  );
}
