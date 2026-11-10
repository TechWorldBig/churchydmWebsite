import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import NetworkGate from './components/NetworkGate'
import { recordVisitor } from './data/api'

const Home = lazy(() => import('./pages/Home'))
const Members = lazy(() => import('./pages/Members'))
const Gallery = lazy(() => import('./pages/Gallery'))
const Attendance = lazy(() => import('./pages/Attendance'))
const About = lazy(() => import('./pages/About'))
const Admin = lazy(() => import('./pages/Admin'))
const Programs = lazy(() => import('./pages/Programs'))
const Offering = lazy(() => import('./pages/Offering'))
const NotFound = lazy(() => import('./pages/NotFound'))

const RouteLoading = () => <div className="grid min-h-[45vh] place-items-center px-5" role="status"><p className="text-sm font-bold text-emerald-800">Loading page…</p></div>
const recordAnonymousVisitor = () => navigator.locks
  ? navigator.locks.request('ydm-anonymous-visitor', { mode: 'exclusive' }, () => recordVisitor())
  : recordVisitor()

export default function App() {
  useEffect(() => {
    recordAnonymousVisitor().catch(() => undefined)
  }, [])
  return (
    <NetworkGate>
      <Layout>
        <Suspense fallback={<RouteLoading />}><Routes>
          <Route path="/" element={<Home />} />
          <Route path="/members" element={<Members />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/offering" element={<Offering />} />
          <Route path="/about" element={<About />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/certificates" element={<Admin section="certificates" />} />
          <Route path="/admin/year-archive" element={<Admin section="archive" />} />
          <Route path="/admin/cake-cover" element={<Admin section="cake-cover" />} />
          <Route path="/admin/annual-speeches" element={<Admin section="annual-speeches" />} />
          <Route path="/admin/yearly-report" element={<Admin section="yearly-report" />} />
          <Route path="*" element={<NotFound />} />
        </Routes></Suspense>
      </Layout>
    </NetworkGate>
  )
}
