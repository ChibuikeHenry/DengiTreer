import { Link } from 'react-router-dom'
import { IconBack, IconCalendar, IconDownload } from './AdminNavIcons'

type AdminPageToolbarProps = {
  title: string
  subtitle: string
  backTo?: string
}

export default function AdminPageToolbar({ title, subtitle, backTo = '/dashboard' }: AdminPageToolbarProps) {
  return (
    <div className="dt-page-toolbar">
      <div className="dt-page-toolbar-left">
        <Link to={backTo} className="dt-back-btn" aria-label="Back">
          <IconBack />
        </Link>
        <div>
          <h1 className="dt-page-title">{title}</h1>
          <p className="dt-page-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="dt-page-toolbar-right">
        <button type="button" className="dt-select-btn">
          <IconCalendar />
          Last 30 days
        </button>
        <button type="button" className="dt-export-btn">
          <IconDownload />
          Export Report
        </button>
      </div>
    </div>
  )
}
