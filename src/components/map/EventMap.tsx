import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Calendar, MapPin, PenTool } from 'lucide-react';
import { apiKeys } from '@/services/api/config';
import type { EventData, VenueData, ArtistData } from '@/types';

// Dark map style matching app's stub-bg
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1816' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d0d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8580' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2724' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1816' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#222018' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a1f14' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#222018' }] },
];

interface EventMapProps {
  events: EventData[];
  venues: Map<string, VenueData>;
  artists: Map<string, ArtistData>;
  centerLat: number;
  centerLng: number;
}

interface VenueCluster {
  venue: VenueData;
  events: EventData[];
}

export function EventMap({
  events,
  venues,
  artists,
  centerLat,
  centerLng,
}: EventMapProps): React.JSX.Element {
  const navigate = useNavigate();
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKeys.googleMaps ?? '',
  });

  // Group events by venue
  const venueClusters = useMemo(() => {
    const clusters = new Map<string, VenueCluster>();
    for (const event of events) {
      const venue = venues.get(event.venueId);
      if (!venue || !venue.lat || !venue.lng) continue;

      if (!clusters.has(event.venueId)) {
        clusters.set(event.venueId, { venue, events: [] });
      }
      clusters.get(event.venueId)!.events.push(event);
    }
    return Array.from(clusters.values());
  }, [events, venues]);

  const onMapClick = useCallback(() => {
    setSelectedVenue(null);
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-96 bg-stub-surface rounded-xl border border-stub-border">
        <div className="w-8 h-8 border-2 border-stub-amber border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-stub-border h-[500px]">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={{ lat: centerLat, lng: centerLng }}
        zoom={11}
        onClick={onMapClick}
        options={{
          styles: DARK_MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
        }}
      >
        {venueClusters.map((cluster) => (
          <MarkerF
            key={cluster.venue.id}
            position={{ lat: cluster.venue.lat, lng: cluster.venue.lng }}
            onClick={() => setSelectedVenue(cluster.venue.id)}
            label={{
              text: String(cluster.events.length),
              color: '#0D0D0D',
              fontWeight: 'bold',
              fontSize: '11px',
            }}
            icon={{
              path: 'M12 0C7.6 0 4 3.6 4 8c0 5.4 8 16 8 16s8-10.6 8-16c0-4.4-3.6-8-8-8z',
              fillColor: '#E8A838',
              fillOpacity: 1,
              strokeColor: '#0D0D0D',
              strokeWeight: 1,
              scale: 1.5,
              anchor: new google.maps.Point(12, 24),
              labelOrigin: new google.maps.Point(12, 9),
            }}
          />
        ))}

        {selectedVenue && (() => {
          const cluster = venueClusters.find((c) => c.venue.id === selectedVenue);
          if (!cluster) return null;
          return (
            <InfoWindowF
              position={{ lat: cluster.venue.lat, lng: cluster.venue.lng }}
              onCloseClick={() => setSelectedVenue(null)}
            >
              <div className="bg-stub-bg text-stub-text p-2 max-w-[250px]" style={{ background: '#1A1816', color: '#F0EDE8' }}>
                <div
                  className="font-bold text-sm mb-1 cursor-pointer hover:underline"
                  style={{ color: '#E8A838' }}
                  onClick={() => navigate(`/venue/${cluster.venue.id}`)}
                >
                  {cluster.venue.name}
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {cluster.events.slice(0, 5).map((event) => {
                    const artist = artists.get(event.artistIds[0]);
                    const d = event.date.toDate();
                    return (
                      <div
                        key={event.id}
                        className="cursor-pointer hover:opacity-80"
                        style={{ borderBottom: '1px solid #2A2724', paddingBottom: '4px' }}
                        onClick={() => navigate(`/artist/${event.artistIds[0]}`)}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>
                          {artist?.name ?? 'Unknown Artist'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#8A8580' }}>
                          {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                  {cluster.events.length > 5 && (
                    <div style={{ fontSize: '10px', color: '#8A8580' }}>
                      +{cluster.events.length - 5} more shows
                    </div>
                  )}
                </div>
              </div>
            </InfoWindowF>
          );
        })()}
      </GoogleMap>
    </div>
  );
}
