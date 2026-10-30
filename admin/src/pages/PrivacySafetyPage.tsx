import AdminPageToolbar from '../components/AdminPageToolbar'

export default function PrivacySafetyPage() {
  return (
    <>
      <AdminPageToolbar
        title="Privacy & Safety"
        subtitle="Handle privacy requests, blocks, and safety reports."
      />
      <div className="dt-form-panel dt-form-panel--solo">
        <div className="dt-privacy-grid">
          <article className="dt-privacy-card">
            <h2>Privacy requests</h2>
            <p>Export or deletion requests from users.</p>
            <span className="dt-privacy-count">0 open</span>
          </article>
          <article className="dt-privacy-card">
            <h2>Safety reports</h2>
            <p>Content or member reports needing review.</p>
            <span className="dt-privacy-count">0 open</span>
          </article>
        </div>
      </div>
    </>
  )
}
