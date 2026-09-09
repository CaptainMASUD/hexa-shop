import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import HexaAssistant from '../components/HexaAssistant'
import { useEffect } from 'react'

export default function StoreLayout() {
  const location = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  return (
    <div className="hexa-shell">
      <Header />
      <main className="min-h-[70vh] pt-16">
        <Outlet />
      </main>
      <Footer />
      <HexaAssistant />
    </div>
  )
}
