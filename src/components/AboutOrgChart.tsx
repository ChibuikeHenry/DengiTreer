export default function AboutOrgChart() {
  return (
    <div className="about-org-chart" role="img" aria-label="Team structure: CEO with Product Designer, Lead Developer, and Developer">
      <svg
        className="about-org-svg"
        viewBox="0 0 360 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="180" y1="58" x2="180" y2="88" stroke="#8fa882" strokeWidth="2" />
        <line x1="60" y1="88" x2="300" y2="88" stroke="#8fa882" strokeWidth="2" />
        <line x1="60" y1="88" x2="60" y2="108" stroke="#8fa882" strokeWidth="2" />
        <line x1="180" y1="88" x2="180" y2="108" stroke="#8fa882" strokeWidth="2" />
        <line x1="300" y1="88" x2="300" y2="108" stroke="#8fa882" strokeWidth="2" />

        <circle cx="180" cy="36" r="32" fill="#34611d" />
        <text
          x="180"
          y="41"
          textAnchor="middle"
          fill="#fff"
          fontSize="13"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          CEO
        </text>

        <circle cx="60" cy="148" r="38" fill="#ddd0e8" />
        <text
          x="60"
          y="142"
          textAnchor="middle"
          fill="#5c3d7a"
          fontSize="9.5"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          <tspan x="60" dy="0">
            Product
          </tspan>
          <tspan x="60" dy="11">
            Designer
          </tspan>
        </text>

        <circle cx="180" cy="148" r="38" fill="#c5d9ea" />
        <text
          x="180"
          y="142"
          textAnchor="middle"
          fill="#1e5580"
          fontSize="9.5"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          <tspan x="180" dy="0">
            Lead
          </tspan>
          <tspan x="180" dy="11">
            Developer
          </tspan>
        </text>

        <circle cx="300" cy="148" r="38" fill="#e8dcc8" />
        <text
          x="300"
          y="148"
          textAnchor="middle"
          fill="#7a5c32"
          fontSize="10"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          Developer
        </text>
      </svg>
    </div>
  )
}
