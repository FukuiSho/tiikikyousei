// import { useEffect, useState } from 'react';
// import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// import 'leaflet/dist/leaflet.css';
// import { useAuth } from '@/lib/context/AuthContext';
// import { supabase } from '@/lib/supabase/client';
// import L from 'leaflet';

// // Fix Leaflet default marker icon
// delete (L.Icon.Default.prototype as any)._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
//   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
// });

// interface Location {
//   latitude: number;
//   longitude: number;
//   user_id: string;
//   username: string;
// }

// interface LocationResponse {
//   latitude: number;
//   longitude: number;
//   user_id: string;
//   profiles: {
//     username: string;
//   }[];
// }

// function Map() {
//   const { user } = useAuth();
//   const [locations, setLocations] = useState<Location[]>([]);
//   const [userLocation, setUserLocation] = useState<[number, number]>([35.6762, 139.6503]);

//   useEffect(() => {
//     if (!user) return;

//     // Initial fetch of locations
//     fetchLocations();

//     // Watch user's location
//     const watchId = navigator.geolocation.watchPosition(
//       async (position) => {
//         const { latitude, longitude } = position.coords;
//         setUserLocation([latitude, longitude]);

//         // Update location in Supabase
//         const { error: locationError } = await supabase
//           .from('locations')
//           .upsert({
//             user_id: user.id,
//             latitude,
//             longitude,
//             updated_at: new Date().toISOString(),
//           }, {
//             onConflict: 'user_id'
//           });

//         if (locationError) {
//           console.error('Error updating location:', locationError);
//         }
//       },
//       (error) => console.error('Error getting location:', error),
//       { enableHighAccuracy: true }
//     );

//     // Subscribe to location changes
//     const subscription = supabase
//       .channel('locations')
//       .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' },
//         () => {
//           fetchLocations();
//         }
//       )
//       .subscribe();

//     return () => {
//       navigator.geolocation.clearWatch(watchId);
//       subscription.unsubscribe();
//     };
//   }, [user]);

//   const fetchLocations = async () => {
//     if (!user) return;

//     const { data, error } = await supabase
//       .from('locations')
//       .select(`
//         latitude,
//         longitude,
//         user_id,
//         profiles (
//           username
//         )
//       `)
//       .neq('user_id', user.id);

//     if (error) {
//       console.error('Error fetching locations:', error);
//       return;
//     }

//     if (!data) return;

//     setLocations(data.map((location: LocationResponse) => ({
//       latitude: location.latitude,
//       longitude: location.longitude,
//       user_id: location.user_id,
//       username: location.profiles?.[0]?.username ?? 'Unknown User'
//     })));
//   };

//   if (!user) return null;

//   return (
//     <div className="h-screen w-full relative">
//       <MapContainer
//         center={userLocation}
//         zoom={13}
//         className="h-full w-full"
//       >
//         <TileLayer
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//         />
//         <Marker position={userLocation}>
//           <Popup>You are here</Popup>
//         </Marker>
//         {locations.map((location) => (
//           <Marker
//             key={location.user_id}
//             position={[location.latitude, location.longitude]}
//           >
//             <Popup>{location.username}</Popup>
//           </Marker>
//         ))}
//       </MapContainer>
//     </div>
//   );
// }

// export default Map
