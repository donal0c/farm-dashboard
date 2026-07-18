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
      className="grid gap-3"
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
      <fieldset className="grid gap-3 sm:grid-cols-2">
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
            className="min-h-11 rounded-md border border-input bg-background px-3 text-base text-foreground"
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
            className="min-h-11 rounded-md border border-input bg-background px-3 text-base text-foreground"
          />
        </label>
      </fieldset>

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error.message}
        </p>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">
          Decimal coordinates provide a keyboard-accessible alternative to
          clicking the map.
        </p>
      )}

      <Button type="submit" variant="outline" className="w-full gap-2">
        <Crosshair className="h-4 w-4" aria-hidden="true" />
        {actionLabel}
      </Button>
    </form>
  );
}
