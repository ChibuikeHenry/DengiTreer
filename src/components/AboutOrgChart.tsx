type OrgNode = {
  id: string
  role: string
  roleLines?: [string, string]
  photoSrc?: string
  cx: number
  cy: number
  fill: string
  textFill: string
  ring: string
}

const NODES: OrgNode[] = [
  {
    id: 'ceo',
    role: 'CEO',
    cx: 200,
    cy: 48,
    fill: '#1f4214',
    textFill: '#ffffff',
    ring: '#1f4214',
  },
  {
    id: 'designer',
    role: 'Product Designer',
    roleLines: ['Product', 'Designer'],
    photoSrc: '/images/team/chinyere-achoromadu.jpg',
    cx: 60,
    cy: 202,
    fill: '#d6b5f0',
    textFill: '#ffffff',
    ring: '#be97dc',
  },
  {
    id: 'lead',
    role: 'Lead Developer',
    roleLines: ['Lead', 'Developer'],
    photoSrc: '/images/team/henry-nwachinemere.jpg',
    cx: 200,
    cy: 202,
    fill: '#a4c4f5',
    textFill: '#ffffff',
    ring: '#94bce8',
  },
  {
    id: 'dev',
    role: 'Developer',
    photoSrc: '/images/team/halima-mamman-biu.jpg',
    cx: 340,
    cy: 202,
    fill: '#e5c08b',
    textFill: '#ffffff',
    ring: '#e2b982',
  },
]

const R = 42

function OrgNodeCircle({ node }: { node: OrgNode }) {
  const clipId = `org-clip-${node.id}`
  const fadeId = `org-fade-${node.id}`
  const hasPhoto = Boolean(node.photoSrc)

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <circle cx={node.cx} cy={node.cy} r={R} />
        </clipPath>
        <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="35%" stopColor="rgba(15,25,12,0)" />
          <stop offset="100%" stopColor="rgba(15,25,12,0.78)" />
        </linearGradient>
      </defs>

      <circle cx={node.cx} cy={node.cy} r={R} fill={node.fill} />

      {hasPhoto ? (
        <>
          <image
            href={node.photoSrc}
            x={node.cx - R}
            y={node.cy - R}
            width={R * 2}
            height={R * 2}
            preserveAspectRatio="xMidYMin slice"
            clipPath={`url(#${clipId})`}
          />
          <circle
            cx={node.cx}
            cy={node.cy}
            r={R}
            fill={`url(#${fadeId})`}
            clipPath={`url(#${clipId})`}
          />
        </>
      ) : null}

      {node.roleLines ? (
        <text
          x={node.cx}
          y={node.cy + (hasPhoto ? 4 : -6)}
          textAnchor="middle"
          fill={hasPhoto ? '#ffffff' : node.textFill}
          fontSize="11"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          <tspan x={node.cx} dy="0">
            {node.roleLines[0]}
          </tspan>
          <tspan x={node.cx} dy="13">
            {node.roleLines[1]}
          </tspan>
        </text>
      ) : (
        <text
          x={node.cx}
          y={node.cy + 5}
          textAnchor="middle"
          fill={hasPhoto ? '#ffffff' : '#ffffff'}
          fontSize="14"
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.02em"
        >
          {node.role}
        </text>
      )}

      <circle cx={node.cx} cy={node.cy} r={R} fill="none" stroke={node.ring} strokeWidth="3" />
      <circle
        cx={node.cx}
        cy={node.cy}
        r={R}
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.5"
      />
    </g>
  )
}

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
        <path
          d="M200 90v40M60 130h280M60 130v30M200 130v30M340 130v30"
          stroke="#477334"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {NODES.map((node) => (
          <OrgNodeCircle key={node.id} node={node} />
        ))}
      </svg>
    </div>
  )
}
