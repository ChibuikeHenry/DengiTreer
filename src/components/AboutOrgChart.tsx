export default function AboutOrgChart() {
  return (
    <div
      className="about-org-chart"
      role="img"
      aria-label="Team structure: CEO with Product Designer, Lead Developer, and Developer"
    >
      <svg
        className="about-org-svg"
        viewBox="0 0 400 270"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Connecting lines */}
        <path
          d="M200 90v40M60 130h280M60 130v30M200 130v30M340 130v30"
          stroke="#477334"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* CEO Node */}
        <circle cx="200" cy="48" r="42" fill="#1f4214" />
        <text
          x="200"
          y="54"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="15"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.02em"
        >
          CEO
        </text>

        {/* Product Designer Node */}
        <circle cx="60" cy="202" r="42" fill="#d6b5f0" />
        <text
          x="60"
          y="197"
          textAnchor="middle"
          fill="#471c67"
          fontSize="12"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          <tspan x="60" dy="0">
            Product
          </tspan>
          <tspan x="60" dy="14">
            Designer
          </tspan>
        </text>

        {/* Lead Developer Node */}
        <circle cx="200" cy="202" r="42" fill="#a4c4f5" />
        <text
          x="200"
          y="197"
          textAnchor="middle"
          fill="#1b4372"
          fontSize="12"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          <tspan x="200" dy="0">
            Lead
          </tspan>
          <tspan x="200" dy="14">
            Developer
          </tspan>
        </text>

        {/* Developer Node */}
        <circle cx="340" cy="202" r="42" fill="#e5c08b" />
        <text
          x="340"
          y="206"
          textAnchor="middle"
          fill="#664316"
          fontSize="12"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          Developer
        </text>
      </svg>
    </div>
  )
}
