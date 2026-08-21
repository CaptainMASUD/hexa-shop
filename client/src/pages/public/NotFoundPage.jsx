import { Link } from 'react-router-dom'
import { BsHexagon } from 'react-icons/bs'
export default function NotFoundPage(){return <div className="hexa-container py-24 text-center"><BsHexagon className="mx-auto text-7xl text-purple-700/40"/><p className="mt-6 text-sm text-purple-400">404</p><h1 className="mt-2 text-4xl font-bold">Page not found</h1><p className="mt-3 text-gray-500">The page you requested does not exist.</p><Link to="/" className="hexa-btn mt-7">Return home</Link></div>}
