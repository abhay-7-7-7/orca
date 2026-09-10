import { Link } from 'react-router-dom'

interface MapThumbnailProps {
  lat: number
  lon: number
  label?: string
}

export default function MapThumbnail({ lat, lon, label }: MapThumbnailProps) {
  // Use a static OSM tile as a thumbnail
  const zoom = 10
  const tileX = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))
  const tileY = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  )
  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`

  return (
    <Link
      to={`/map?lat=${lat}&lon=${lon}`}
      className="inline-block mt-2 rounded-lg overflow-hidden border border-cream-200 hover:border-terracotta-500 transition-colors no-underline group"
    >
      <div className="relative w-48 h-24">
        <img
          src={tileUrl}
          alt={label || `Map at ${lat.toFixed(2)}, ${lon.toFixed(2)}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {/* Pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-3 h-3 rounded-full bg-terracotta-500 border-2 border-white shadow-md" />
        </div>
        {/* Label */}
        <div className="absolute bottom-1.5 left-2 right-2">
          <p className="text-[10px] text-white font-medium truncate">
            📍 {label || `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`}
          </p>
        </div>
        {/* Hover indicator */}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] px-1.5 py-0.5 bg-white/90 rounded text-charcoal-900 font-medium">
            View on map →
          </span>
        </div>
      </div>
    </Link>
  )
}
