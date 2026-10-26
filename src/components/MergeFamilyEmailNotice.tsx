type Props = {
  onAddWithoutMerge: () => void
  addWithoutMergeLabel: string
}

export default function MergeFamilyEmailNotice({
  onAddWithoutMerge,
  addWithoutMergeLabel,
}: Props) {
  return (
    <div className="mf-email-notice" role="status">
      <p>This user already exists on DengiTree. Use Merge family below to combine trees.</p>
      <button type="button" className="mf-email-notice-link" onClick={onAddWithoutMerge}>
        {addWithoutMergeLabel}
      </button>
    </div>
  )
}
