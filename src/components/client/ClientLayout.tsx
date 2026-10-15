import { Navigate, Outlet } from 'react-router-dom'
import { Sidebar, TabBar, type SidebarItem } from '@/components/ui'
import {
  ClipboardIcon,
  DumbbellIcon,
  FileIcon,
  GridIcon,
  HomeIcon,
  LeafIcon,
  QuestionIcon,
} from '@/components/ui/icons'
import { useMyProgram } from '@/hooks/useMyProgram'
import { homeForStatus } from '@/lib/programHome'

/**
 * Okvir klijentskih ekrana (TabBar ispod 1024px, sidebar od 1024px). Pušta samo klijente sa aktivnim
 * programom: ostali idu na svoj ekran po statusu (uplata, Dan 0, Dan 1, kraj).
 */
export default function ClientLayout() {
  const my = useMyProgram()

  if (my.isPending) {
    return (
      <p role="status" className="p-6 text-muted">
        Učitavanje…
      </p>
    )
  }
  if (my.isError) {
    return (
      <p role="alert" className="p-6 font-bold text-danger">
        Program nije moguće učitati. Osveži stranicu.
      </p>
    )
  }
  if (!my.program) return <Navigate to="/app" replace />
  if (my.program.status !== 'active') {
    return <Navigate to={homeForStatus(my.program.status)} replace />
  }
  if (my.day > my.duration) return <Navigate to="/app/kraj" replace />

  const items: SidebarItem[] = [
    { to: '/app/danas', label: 'Početna', icon: <HomeIcon /> },
    { to: '/app/ishrana', label: 'Ishrana', icon: <LeafIcon /> },
    { to: '/app/suplementi', label: 'Suplementi', icon: <FileIcon /> },
    ...(my.withTraining ? [{ to: '/app/vezbe', label: 'Vežbe', icon: <DumbbellIcon /> }] : []),
    { to: '/app/tok', label: 'Tok programa', icon: <ClipboardIcon /> },
    { to: '/app/napredak', label: 'Napredak', icon: <GridIcon /> },
    { to: '/app/pitanja', label: 'Pitanja', icon: <QuestionIcon /> },
  ]

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar
        title="Moj program"
        items={items}
        user={{
          name: my.profile?.full_name ?? my.profile?.email ?? '',
          role: `Dan ${my.day} od ${my.duration}`,
          tone: 'client',
        }}
      />
      <div className="min-w-0 flex-1 pb-32 lg:pb-10">
        <Outlet />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-10 lg:hidden">
        <TabBar />
      </div>
    </div>
  )
}
