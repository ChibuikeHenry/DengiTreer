import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AdminPageToolbar from '../components/AdminPageToolbar'
import { IconPlusSquare, IconUserPlus } from '../components/AdminNavIcons'

const quickTips = [
  'Use a valid email address (this helps with account recovery)',
  "You can add family members later from the user's profile.",
  'If the user already exists, you will be prompted to merge families.',
]

export default function AddUserPage() {
  const notesId = useId()
  const [notes, setNotes] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
  }

  return (
    <>
      <AdminPageToolbar
        title="Add User"
        subtitle="Create a new user account and optionally link them to a family tree."
      />

      <div className="dt-form-layout">
        <form className="dt-form-panel" onSubmit={handleSubmit}>
          <div className="dt-form-grid">
            <div className="dt-field">
              <label htmlFor="add-first-name">First Name</label>
              <input id="add-first-name" type="text" placeholder="Enter your first name" />
            </div>
            <div className="dt-field">
              <label htmlFor="add-dob">Date of Birth (Optional)</label>
              <div className="dt-input-icon-wrap">
                <input id="add-dob" type="date" placeholder="dd/mm/yyyy" />
              </div>
            </div>
            <div className="dt-field">
              <label htmlFor="add-last-name">Last Name</label>
              <input id="add-last-name" type="text" placeholder="Enter your last name" />
            </div>
            <div className="dt-field">
              <label htmlFor="add-gender">Gender</label>
              <select id="add-gender" defaultValue="">
                <option value="" disabled>
                  Select gender
                </option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer-not">Prefer not to say</option>
              </select>
            </div>
            <div className="dt-field">
              <label htmlFor="add-email">Email Address</label>
              <input id="add-email" type="email" placeholder="Enter your email address" />
            </div>
            <div className="dt-field">
              <label htmlFor="add-location">Location (Optional)</label>
              <input id="add-location" type="text" placeholder="e.g Lagos, Nigeria" />
            </div>
            <div className="dt-field">
              <label htmlFor="add-phone">Phone Number</label>
              <input id="add-phone" type="tel" placeholder="Enter your phone number" />
            </div>
            <div className="dt-field dt-field--span-notes">
              <label htmlFor={notesId}>Notes (Optional)</label>
              <textarea
                id={notesId}
                rows={4}
                maxLength={500}
                placeholder="Add a note about this user (e.g source, role, etc)."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <span className="dt-char-count">{notes.length}/500</span>
            </div>
            <div className="dt-field">
              <label htmlFor="add-relationship">Relationship</label>
              <select id="add-relationship" defaultValue="">
                <option value="" disabled>
                  Select relationship
                </option>
                <option value="self">Self (tree owner)</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="spouse">Spouse</option>
                <option value="sibling">Sibling</option>
                <option value="member">Other member</option>
              </select>
            </div>
          </div>

          <div className="dt-form-actions">
            <Link to="/users" className="dt-btn-outline">
              Cancel
            </Link>
            <button type="submit" className="dt-btn-primary">
              <IconUserPlus size={18} />
              Add User
            </button>
          </div>
        </form>

        <aside className="dt-tips-rail">
          <section className="dt-tips-card">
            <p className="dt-tips-lead">Need to create a family tree for this user?</p>
            <Link to="/create-family-tree" className="dt-btn-outline dt-btn-outline--block">
              <IconPlusSquare size={18} />
              Create Family Tree for User
            </Link>
          </section>
          <section className="dt-tips-card">
            <h2>Quick Tips</h2>
            <ul className="dt-tips-list">
              {quickTips.map((tip) => (
                <li key={tip}>
                  <span className="dt-tip-check" aria-hidden="true">
                    ✓
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  )
}
