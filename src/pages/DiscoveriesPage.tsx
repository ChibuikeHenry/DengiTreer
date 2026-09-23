import { DashIcons } from '../components/DashboardLayout'

export default function DiscoveriesPage() {
  return (
    <div className="home disc-page">
      <section className="home-card disc-panel">
        <header className="disc-head">
          <h1>Discover Connections</h1>
          <p>
            Find relative, explore shared heritage and uncover new stories in your
            family network.
          </p>
        </header>

        <div className="disc-search-row">
          <label className="disc-search">
            <span className="sr-only">Search</span>
            {DashIcons.search()}
            <input type="search" placeholder="Search by name, relation or location..." />
          </label>
          <button type="button" className="disc-search-btn">
            Search
          </button>
        </div>

        <ol className="home-steps disc-steps">
          <li>
            <div className="step-icon-wrap">{DashIcons.people()}</div>
            <p>
              <strong>Find Relative</strong>
              Create your profile to get started.
            </p>
          </li>
          <li>
            <div className="step-icon-wrap step-icon-empty" />
            <p>
              <strong>Add family members</strong>
              Add your parent siblings and other relatives.
            </p>
          </li>
          <li>
            <div className="step-icon-wrap">{DashIcons.mail()}</div>
            <p>
              <strong>Invite Relatives</strong>
              Invite family members to join and contribute.
            </p>
          </li>
          <li>
            <div className="step-icon-wrap step-icon-grow">{DashIcons.leaf()}</div>
            <p>
              <strong>Grow your Tree</strong>
              Build branches together and preserve your legacy.
            </p>
          </li>
        </ol>
      </section>
    </div>
  )
}
