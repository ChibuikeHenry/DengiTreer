import UpcomingBadge from '../components/UpcomingBadge'
import { DashIcons } from '../components/DashboardLayout'

const sampleSlots = Array.from({ length: 8 }, (_, i) => i)

export default function PhotosPage() {
  return (
    <div className="home upcoming-page photos-page">
      <header className="upcoming-head">
        <div>
          <h1>Photos</h1>
          <p>Collect family photos, tag people, and attach memories to your tree.</p>
        </div>
        <button type="button" className="upcoming-primary-btn upcoming-primary-btn-disabled" disabled>
          {DashIcons.upload()}
          Upload photos
          <UpcomingBadge label="Soon" />
        </button>
      </header>

      <section className="home-card upcoming-panel photos-upload-preview">
        <div className="photos-dropzone" aria-hidden="true">
          {DashIcons.image()}
          <strong>Drag photos here</strong>
          <span>Albums and tagging are on the way</span>
        </div>
      </section>

      <section className="home-card upcoming-panel">
        <div className="photos-section-head">
          <h2>Recent uploads</h2>
          <UpcomingBadge />
        </div>
        <div className="photos-grid photos-grid-placeholder">
          {sampleSlots.map((slot) => (
            <div key={slot} className="photos-grid-cell" aria-hidden="true" />
          ))}
        </div>
        <div className="upcoming-empty upcoming-empty-compact">
          <p>No albums yet. Profile pictures you add today appear on the tree; full galleries will live here.</p>
        </div>
      </section>

      <section className="home-card upcoming-preview-card">
        <h2>Planned for Photos</h2>
        <ul className="upcoming-feature-list">
          <li>Link photos to people on your tree</li>
          <li>Shared family albums</li>
          <li>Date and place metadata</li>
          <li>Download originals</li>
        </ul>
      </section>
    </div>
  )
}
