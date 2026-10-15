import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Fix for default marker icon issues in Vite/React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MapProps {
    logs: any[];
    selectedLog?: any;
}

const MapCenterer = ({ selectedLog }: { selectedLog: any }) => {
    const map = useMap();
    
    useEffect(() => {
        if (selectedLog) {
            const points: [number, number][] = [];
            if (selectedLog.loginLat && selectedLog.loginLong) points.push([selectedLog.loginLat, selectedLog.loginLong]);
            if (selectedLog.logoutLat && selectedLog.logoutLong) points.push([selectedLog.logoutLat, selectedLog.logoutLong]);
            
            if (points.length > 0) {
                if (points.length === 1) {
                    map.flyTo(points[0], 15, { duration: 1.5 });
                } else {
                    const bounds = L.latLngBounds(points);
                    map.flyToBounds(bounds, { padding: [100, 100], duration: 1.5 });
                }
            } else if (selectedLog.coordinates) {
                // Fallback for legacy format if any
                const parts = selectedLog.coordinates.split(', ');
                if (parts.length === 2) {
                    const lat = parseFloat(parts[0].replace('Lat: ', ''));
                    const lng = parseFloat(parts[1].replace('Long: ', ''));
                    if (!isNaN(lat) && !isNaN(lng)) map.flyTo([lat, lng], 15, { duration: 1.5 });
                }
            }
        }
    }, [selectedLog, map]);

    return null;
};

// Custom icons for different actions
const loginIcon = L.divIcon({
    html: `<div style="background-color: #10b981; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-div-icon',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

const logoutIcon = L.divIcon({
    html: `<div style="background-color: #f59e0b; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-div-icon',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

const defaultIcon = L.divIcon({
    html: `<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-div-icon',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

const MapComponent = ({ logs, selectedLog }: MapProps) => {
    const validLogs = useMemo(
        () => logs.filter(log => log.loginLat !== null && log.loginLong !== null),
        [logs]
    );
    const markerRefs = useRef<Record<string, L.Marker>>({});

    useEffect(() => {
        if (selectedLog) {
            setTimeout(() => {
                if (markerRefs.current[selectedLog.id]) {
                    markerRefs.current[selectedLog.id].openPopup();
                }
            }, 500);
        }
    }, [selectedLog]);
    
    const defaultCenter: [number, number] = validLogs.length > 0
        ? [validLogs[0].loginLat, validLogs[0].loginLong]
        : [28.6139, 77.2090];

    return (
        <Card className="bespoke-shadow overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg font-bold">
                            {selectedLog ? `Activity Timeline: ${selectedLog.employee}` : "Employee Login Map"}
                        </CardTitle>
                        <CardDescription>
                            {selectedLog 
                                ? `Sequential location history for ${selectedLog.employee}.` 
                                : "Real-time visualization of employee access points across the region."}
                        </CardDescription>
                    </div>
                    {selectedLog && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 animate-pulse">
                            Viewing History
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div style={{ height: '500px', width: '100%' }} className="relative z-0">
                    <MapContainer 
                        center={defaultCenter} 
                        zoom={4} 
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; OpenStreetMap contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapCenterer selectedLog={selectedLog} />
                        
                        {!selectedLog && validLogs.map((log) => {
                            const lat = log.loginLat;
                            const lng = log.loginLong;
                            if (lat === null || lng === null) return null;

                            return (
                                <Marker 
                                    key={`log-${log.id}`} 
                                    position={[lat, lng]}
                                    icon={log.status === 'LOGOUT' ? logoutIcon : loginIcon}
                                    ref={(ref) => {
                                        if (ref) markerRefs.current[log.id] = ref;
                                    }}
                                >
                                    <Popup>
                                        <div className="p-1 min-w-[120px]">
                                            <p className="font-bold text-slate-900 mb-1">{log.employee}</p>
                                            <div className="flex items-center gap-1 mb-2">
                                                <div className={`w-2 h-2 rounded-full ${log.status === 'LOGOUT' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                <span className="text-[10px] font-medium uppercase tracking-wider">{log.status}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-600"><strong>Device:</strong> {log.device}</p>
                                            <p className="text-[10px] text-slate-600"><strong>Time:</strong> {log.loginTime}</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}

                        {selectedLog && (
                            <>
                                {selectedLog.loginLat && selectedLog.loginLong && (
                                    <Marker 
                                        position={[selectedLog.loginLat, selectedLog.loginLong]}
                                        icon={loginIcon}
                                    >
                                        <Popup>
                                            <div className="p-1 min-w-[120px]">
                                                <p className="font-bold text-emerald-700">Login Point</p>
                                                <p className="text-[10px] text-slate-600">{selectedLog.loginTime}</p>
                                                <p className="text-[10px] text-slate-500">{selectedLog.employee}</p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )}

                                {selectedLog.logoutLat && selectedLog.logoutLong && (
                                    <Marker 
                                        position={[selectedLog.logoutLat, selectedLog.logoutLong]}
                                        icon={logoutIcon}
                                    >
                                        <Popup>
                                            <div className="p-1 min-w-[120px]">
                                                <p className="font-bold text-red-700">Logout Point</p>
                                                <p className="text-[10px] text-slate-600">{selectedLog.logoutTime}</p>
                                                <p className="text-[10px] text-slate-500">{selectedLog.employee}</p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )}

                                {selectedLog.loginLat && selectedLog.loginLong && selectedLog.logoutLat && selectedLog.logoutLong && (
                                    <Polyline 
                                        positions={[
                                            [selectedLog.loginLat, selectedLog.loginLong],
                                            [selectedLog.logoutLat, selectedLog.logoutLong]
                                        ]} 
                                        color="#3b82f6" 
                                        weight={3} 
                                        opacity={0.6} 
                                        dashArray="10, 10" 
                                    />
                                )}
                            </>
                        )}
                    </MapContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default MapComponent;
