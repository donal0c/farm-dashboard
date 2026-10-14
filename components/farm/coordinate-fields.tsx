"use client";

import { Crosshair } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { LatLng } from "@/lib/contracts/geo";
import {
  type CoordinateField,
  formatCoordinate,
  parseFarmCoordinates,
} from "@/lib/farm-location";

type CoordinateFieldsProps = {
  idPrefix: string;
  value: LatLng | null;
  onApply: (location: LatLng) => void;
  actionLabel?: string;
};

export function CoordinateFields({
  idPrefix,
  value,
  onApply,
  actionLabel = "Place farm point",
}: CoordinateFieldsProps) {
  const [latitude, setLatitude] = useState(
    value ? formatCoordinate(value.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    value ? formatCoordinate(value.longitude) : "",
  );
  const [error, setError] = useState<{
    field: CoordinateField;
    message: string;
  } | null>(null);

  useEffect(() => {
    setLatitude(value ? formatCoordinate(value.latitude) : "");
    setLongitude(value ? formatCoordinate(value.longitude) : "");
    setError(null);
  }, [value]);

  const errorId = `${idPrefix}-coordinate-error`;

  return (
    <form
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = parseFarmCoordinates(latitude, longitude);
        if (!parsed.ok) {
          setError(parsed);
          return;
        }
        setError(null);
        onApply(parsed.location);
      }}
    >
      <fieldset className="contents">
        <legend className="sr-only">Farm point coordinates</legend>
        <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
          Latitude
          <input
            id={`${idPrefix}-latitude`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={latitude}
            onChange={(event) => {
              setLatitude(event.target.value);
              setError(null);
            }}
            aria-invalid={
              error?.field === "latitude" || error?.field === "both"
                ? true
                : undefined
            }
            aria-describedby={error ? errorId : undefined}
            className="control text-base"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
          Longitude
          <input
            id={`${idPrefix}-longitude`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={longitude}
            onChange={(event) => {
              setLongitude(event.target.value);
              setError(null);
            }}
            aria-invalid={
              error?.field === "longitude" || error?.field === "both"
                ? true
                : undefined
            }
            aria-describedby={error ? errorId : undefined}
            className="control text-base"
          />
        </label>
      </fieldset>

      <Button type="submit" variant="outline">
        <Crosshair className="h-4 w-4" aria-hidden="true" />
        {actionLabel}
      </Button>

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-act sm:col-span-3">
          {error.message}
        </p>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground sm:col-span-3">
          Decimal coordinates are the keyboard route to the same point.
        </p>
      )}
    </form>
  );
}
