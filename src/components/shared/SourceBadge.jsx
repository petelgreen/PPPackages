const SOURCES = {
  israelPost: {
    label: 'Israel Post',
    emoji: '📮',
    classes: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  },
}

export default function SourceBadge({ source }) {
  if (!source || !SOURCES[source]) return null
  const { label, emoji, classes } = SOURCES[source]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      {emoji} {label}
    </span>
  )
}
