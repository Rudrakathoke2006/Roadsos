import React, { useEffect, useState } from "react";
import { Hospital, Responder, Incident } from "../types";
import { Landmark, Compass, Eye, ShieldAlert, Crosshair, MapPin, Ambulance } from "lucide-react";

interface InteractiveMapProps {
  hospitals: Hospital[];
  responders: Responder[];
  activeIncident: Incident | null;
  trackPath: { lat: number; lng: number }[] | null;
  onSelectHospital?: (hospital: Hospital) => void;
  onSelectResponder?: (responder: Responder) => void;
}

// Convert coordinates to localized SVG pixels
// Pune center roughly: 18.5204 N, 73.8567 E
// Map boundary box fits:
// Min Lat: 18.4500, Max Lat: 18.6500 (PCMC to Katraj)
// Min Lng: 73.7500, Max Lng: 73.9000
const MIN_LAT = 18.4500;
const MAX_LAT = 18.6500;
const MIN_LNG = 73.7500;
const MAX_LNG = 73.9000;

function convertCoordsToPixels(lat: number, lng: number, width: number, height: number) {
  // Flip Y because SVG 0,0 is top-left
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * width;
  const y = (1 - (lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * height;
  return { x, y };
}

export default function InteractiveMap({
  hospitals,
  responders,
  activeIncident,
  trackPath,
  onSelectHospital,
  onSelectResponder,
}: InteractiveMapProps) {
  const width = 600;
  const height = 450;

  // Track state for simulated animated vehicle along path
  const [ambulancePos, setAmbulancePos] = useState<{ x: number; y: number } | null>(null);
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (trackPath && trackPath.length > 0) {
      let interval = setInterval(() => {
        setAnimationStep((prev) => {
          const next = (prev + 1) % trackPath.length;
          const pos = convertCoordsToPixels(trackPath[next].lat, trackPath[next].lng, width, height);
          setAmbulancePos(pos);
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setAmbulancePos(null);
    }
  }, [trackPath]);

  // Pune - Bangalore Highway vector path
  const highwayCoords = [
    { lat: 18.6367, lng: 73.7912 }, // Chinchwad Highway Point
    { lat: 18.5820, lng: 73.7780 }, // Wakad Point
    { lat: 18.5583, lng: 73.7801 }, // Baner Point
    { lat: 18.5134, lng: 73.8112 }, // Senapati Bapat Road
    { lat: 18.4612, lng: 73.8410 }, // Katraj Crossing
  ];

  type Point = { x: number; y: number };
  const highwayPixels: Point[] = highwayCoords.map((c) =>
    convertCoordsToPixels(c.lat, c.lng, width, height)
  );

  // Generate smooth SVG d-string for the highway line
  const dString = highwayPixels.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} Q ${highwayPixels[i - 1].x} ${highwayPixels[i - 1].y}, ${p.x} ${p.y}`;
  }, "");

  // Municipal streets grid simulator lines
  const cityMuniStreets = [
    [
      { lat: 18.5286, lng: 73.7510 },
      { lat: 18.5286, lng: 73.8990 },
    ], // Erandwane Road
    [
      { lat: 18.5700, lng: 73.8100 },
      { lat: 18.5000, lng: 73.8800 },
    ], // FC Road
    [
      { lat: 18.6100, lng: 73.8200 },
      { lat: 18.5300, lng: 73.8200 },
    ], // University Road
  ];

  return (
    <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Map Stats Header */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 bg-slate-900/90 backdrop-blur border border-slate-700/60 px-3 py-1.5 rounded-full text-[11px] font-mono text-slate-300 shadow">
        <Compass className="w-3.5 h-3.5 text-rose-500 animate-spin-slow" />
        <span>PUNE INTERACTIVE EMS RADAR</span>
      </div>

      <div className="absolute top-4 right-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-700/60 px-3 py-1 text-[10px] font-mono text-emerald-400 rounded-full flex items-center gap-1.5 shadow">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
        <span>GPS TRACE CALIBRATED</span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none"
        style={{ background: "#060b13" }}
      >
        <defs>
          <radialGradient id="beaconGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        {/* Outer boundaries / Map Grid lines */}
        <g stroke="#334155" strokeWidth="0.5" opacity="0.15">
          <line x1="100" y1="0" x2="100" y2={height} />
          <line x1="200" y1="0" x2="200" y2={height} />
          <line x1="300" y1="0" x2="300" y2={height} />
          <line x1="400" y1="0" x2="400" y2={height} />
          <line x1="500" y1="0" x2="500" y2={height} />
          <line x1="0" y1="100" x2={width} y2="100" />
          <line x1="0" y1="200" x2={width} y2="200" />
          <line x1="0" y1="300" x2={width} y2="300" />
          <line x1="0" y1="400" x2={width} y2="400" />
        </g>

        {/* City Municipal Roads */}
        {cityMuniStreets.map((street, i) => {
          const p1 = convertCoordsToPixels(street[0].lat, street[0].lng, width, height);
          const p2 = convertCoordsToPixels(street[1].lat, street[1].lng, width, height);
          return (
            <line
              key={i}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#1e293b"
              strokeWidth="3"
              strokeDasharray="4,4"
              opacity="0.8"
            />
          );
        })}

        {/* NH-48 Expressway Highway Vector */}
        <path
          id="highway"
          d={dString}
          fill="none"
          stroke="#334155"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={dString}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="1.5"
          strokeDasharray="8,6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />

        {/* Text Labels for Highway */}
        <text
          x={width * 0.3}
          y={height * 0.45}
          fill="#475569"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
          transform="rotate(-23, 200, 200)"
        >
          AH-47 / NH-48 EXPRESSWAY (PUNE-MUMBAI)
        </text>

        <text
          x={width * 0.8}
          y={height * 0.88}
          fill="#334155"
          fontSize="9"
          fontFamily="monospace"
        >
          ◄ KATRAJ CHOWK
        </text>

        {/* active GPS tracker path from Responder to Incident */}
        {trackPath && trackPath.length > 0 && (
          <g>
            <polyline
              points={trackPath
                .map((pt) => {
                  const p = convertCoordsToPixels(pt.lat, pt.lng, width, height);
                  return `${p.x},${p.y}`;
                })
                .join(" ")}
              fill="none"
              stroke="#10b981"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6,4"
              className="animate-dashboard-path"
              opacity="0.9"
            />
          </g>
        )}

        {/* Active Incident Beacon location */}
        {activeIncident && (
          <g>
            {/* Beacon Pulsing ring circles */}
            <circle
              cx={convertCoordsToPixels(activeIncident.latitude, activeIncident.longitude, width, height).x}
              cy={convertCoordsToPixels(activeIncident.latitude, activeIncident.longitude, width, height).y}
              r="40"
              fill="url(#beaconGlow)"
            >
              <animate
                attributeName="r"
                values="15;55;15"
                dur="2.5s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={convertCoordsToPixels(activeIncident.latitude, activeIncident.longitude, width, height).x}
              cy={convertCoordsToPixels(activeIncident.latitude, activeIncident.longitude, width, height).y}
              r="6"
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            {/* Flash Crosshair lock */}
            <g
              transform={`translate(${
                convertCoordsToPixels(activeIncident.latitude, activeIncident.longitude, width, height).x - 12
              }, ${
                convertCoordsToPixels(activeIncident.latitude, activeIncident.longitude, width, height).y - 12
              })`}
            >
              <path
                d="M 12 0 L 12 6 M 12 18 L 12 24 M 0 12 L 6 12 M 18 12 L 24 12"
                stroke="#f43f5e"
                strokeWidth="1.5"
                opacity="0.85"
              />
            </g>
          </g>
        )}

        {/* Hospital coordinates marker pins */}
        {hospitals.map((hosp) => {
          const pos = convertCoordsToPixels(hosp.latitude, hosp.longitude, width, height);
          const isAssigned =
            activeIncident &&
            hosp.id === "hosp-jupiter"; // Highlight associated trauma hosp
          return (
            <g
              key={hosp.id}
              onClick={() => onSelectHospital && onSelectHospital(hosp)}
              className="cursor-pointer group"
            >
              <rect
                x={pos.x - 8}
                y={pos.y - 24}
                width="16"
                height="22"
                rx="3"
                fill={isAssigned ? "#3b82f6" : "#1e293b"}
                stroke={isAssigned ? "#60a5fa" : "#475569"}
                strokeWidth="1"
              />
              <path
                d="M-3,-13 L3,-13 M0,-16 L0,-10"
                stroke="#38bdf8"
                strokeWidth="1.5"
                transform={`translate(${pos.x}, ${pos.y})`}
              />
              <circle cx={pos.x} cy={pos.y} r="2" fill="#0f172a" />
              {/* Tooltip Hover tag */}
              <g opacity="0" className="group-hover:opacity-100 transition-opacity duration-150">
                <rect
                  x={pos.x - 65}
                  y={pos.y - 42}
                  width="130"
                  height="16"
                  rx="3"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="1"
                />
                <text
                  x={pos.x}
                  y={pos.y - 31}
                  fill="#f8fafc"
                  fontSize="7"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {hosp.short_name} ({hosp.trauma_level})
                </text>
              </g>
            </g>
          );
        })}

        {/* Responders coordinates markers */}
        {responders.map((resp) => {
          const pos = convertCoordsToPixels(resp.latitude, resp.longitude, width, height);
          const isDispatched = resp.status === "DISPATCHED" || resp.status === "EN_ROUTE";
          return (
            <g
              key={resp.id}
              onClick={() => onSelectResponder && onSelectResponder(resp)}
              className="cursor-pointer group"
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r="10"
                fill={isDispatched ? "#10b981" : "#1e293b"}
                stroke={isDispatched ? "#34d399" : "#475569"}
                strokeWidth="1"
                className={isDispatched ? "animate-pulse" : ""}
                opacity="0.9"
              />
              <path
                d="M -4,-2 C -3,-5 3,-5 4,-2 L 4,3 L -4,3 Z"
                fill="#ffffff"
                transform={`translate(${pos.x}, ${pos.y})`}
              />
              {/* Red-Blue flash siren if dispatched */}
              {isDispatched && (
                <circle
                  cx={pos.x}
                  cy={pos.y - 6}
                  r="2"
                  fill="#3b82f6"
                  className="animate-pulse"
                />
              )}
              {/* Hover tags */}
              <g opacity="0" className="group-hover:opacity-100 transition-opacity duration-150">
                <rect
                  x={pos.x - 70}
                  y={pos.y - 34}
                  width="140"
                  height="16"
                  rx="3"
                  fill="#111827"
                  stroke="#10b981"
                  strokeWidth="1"
                />
                <text
                  x={pos.x}
                  y={pos.y - 24}
                  fill="#ffffff"
                  fontSize="7"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {resp.call_sign} ({resp.status})
                </text>
              </g>
            </g>
          );
        })}

        {/* Animated actual moving ambulance */}
        {ambulancePos && (
          <g>
            <circle
              cx={ambulancePos.x}
              cy={ambulancePos.y}
              r="13"
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth="2"
              className="shadow-xl"
            />
            {/* simple cross vector inside moving dot */}
            <path
              d="M -4,0 L 4,0 M 0,-4 L 0,4"
              stroke="#ffffff"
              strokeWidth="2"
              transform={`translate(${ambulancePos.x}, ${ambulancePos.y})`}
            />
            {/* Blinking red beacon */}
            <circle
              cx={ambulancePos.x - 5}
              cy={ambulancePos.y - 5}
              r="3.5"
              fill="#ef4444"
              className="animate-ping"
            />
          </g>
        )}
      </svg>

      {/* Map Legend info footer overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] bg-slate-950/85 backdrop-blur border border-slate-800/80 px-4 py-2.5 rounded-xl font-mono text-slate-400">
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-blue-600 rounded border border-blue-400 block"></span>
            Trauma Center
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full block"></span>
            Ambulance (Idle)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping block"></span>
            Unit (Dispatched)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full block animate-pulse"></span>
            Accident Site
          </span>
        </div>
        <div className="text-[9px] text-slate-500">
          Scale: Haversine Calibrated
        </div>
      </div>
    </div>
  );
}
