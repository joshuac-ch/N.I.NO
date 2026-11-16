import { Map, Radio, Route, Satellite, VectorPolygon } from 'lucide-react'


export default function SidebarComponent() {
  return (
    <div className="p-4">
        <div className="flex gap-2 py-2">
            <span><Radio /></span>
            <span>Supervivencia</span>
        </div>
        <div className="flex gap-2 py-2">
            <span><Route></Route></span>
            <span>Navegacion & Ruta</span>
        </div>
        <div className="flex gap-2 py-2">
            <span><Map></Map></span>
            <span>Terrreno & Espectro</span>
        </div>
        <div className="flex gap-2 py-2">
            <span><Satellite></Satellite></span>
            <span>Relle Orbital MRO </span>
        </div>
        <div className="flex gap-2 py-2">
            <span><VectorPolygon></VectorPolygon></span>
            <span>LOG EVA JEZERO</span>
        </div>
    </div>
  )
}
