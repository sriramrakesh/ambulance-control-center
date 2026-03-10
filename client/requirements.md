## Packages
leaflet | Map rendering library
react-leaflet | React bindings for Leaflet maps
@types/leaflet | TypeScript definitions for Leaflet
recharts | Analytics dashboard charts
date-fns | Formatting timestamps

## Notes
Map uses CartoDB Dark Matter tiles which do not require an API key.
Leaflet CSS is imported via unpkg in index.css to ensure map renders correctly.
Ambulances and Traffic Lights data are polled every 1000ms via react-query to simulate real-time movement and state changes.
