"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef, useState } from "react";
import styles from "./AddressesPage.module.css";

export type MapPoint = { lat: number; lng: number };

// Ranchi, used until the shopper picks a spot.
const DEFAULT_CENTER: MapPoint = { lat: 23.3441, lng: 85.3096 };

function roundCoordinate(value: number) {
  return Math.round(value * 1e6) / 1e6;
}

/** Map where the shopper clicks or drags a pin to mark the exact delivery spot. */
export function LocationPicker({ value, onChange }: { value: MapPoint | null; onChange: (point: MapPoint | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const placeMarkerRef = useRef<(point: MapPoint) => void>(() => {});
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Leaflet needs `window`, so it is loaded only in the browser.
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const start = initialValueRef.current;
      const map = L.map(containerRef.current, { scrollWheelZoom: false })
        .setView(start ?? DEFAULT_CENTER, start ? 17 : 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const icon = L.divIcon({ className: styles.mapPin, iconSize: [28, 28], iconAnchor: [14, 28] });
      const report = (point: MapPoint) => onChangeRef.current({ lat: roundCoordinate(point.lat), lng: roundCoordinate(point.lng) });
      placeMarkerRef.current = (point) => {
        if (markerRef.current) {
          markerRef.current.setLatLng(point);
        } else {
          markerRef.current = L.marker(point, { draggable: true, icon }).addTo(map);
          markerRef.current.on("dragend", () => {
            const position = markerRef.current?.getLatLng();
            if (position) report(position);
          });
        }
      };
      if (start) placeMarkerRef.current(start);
      map.on("click", (event) => {
        placeMarkerRef.current(event.latlng);
        report(event.latlng);
      });
      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  function locateMe() {
    if (!navigator.geolocation) {
      setLocateError("Your browser can't share its location. Tap the map instead.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: roundCoordinate(position.coords.latitude), lng: roundCoordinate(position.coords.longitude) };
        placeMarkerRef.current(point);
        mapRef.current?.setView(point, 17);
        onChangeRef.current(point);
        setLocating(false);
      },
      () => {
        setLocateError("We couldn't get your location. Allow location access, or tap the map instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function removePin() {
    markerRef.current?.remove();
    markerRef.current = null;
    onChangeRef.current(null);
  }

  return (
    <div className={styles.mapField}>
      <div className={styles.map} ref={containerRef} />
      <div className={styles.mapActions}>
        <button className="btn secondary" disabled={locating} onClick={locateMe} type="button">
          {locating ? "Finding you…" : "📍 Use my current location"}
        </button>
        {value ? <button className={styles.textButton} onClick={removePin} type="button">Remove pin</button> : null}
        <small>{value ? `Pinned at ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : "Tap the map to drop a pin, then drag it to the exact spot."}</small>
      </div>
      {locateError ? <p className={styles.mapError} role="alert">{locateError}</p> : null}
    </div>
  );
}
