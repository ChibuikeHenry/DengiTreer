import AdminPageToolbar from '../components/AdminPageToolbar'

type PlaceholderPageProps = {
  title: string
  subtitle: string
}

export default function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <>
      <AdminPageToolbar title={title} subtitle={subtitle} />
      <div className="dt-panel" style={{ padding: '2.5rem', textAlign: 'center', color: '#5c6456' }}>
        This section is coming soon.
      </div>
    </>
  )
}
