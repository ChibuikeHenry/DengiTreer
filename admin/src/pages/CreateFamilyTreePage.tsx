import AdminPageToolbar from '../components/AdminPageToolbar'

export default function CreateFamilyTreePage() {
  return (
    <>
      <AdminPageToolbar
        title="Create Family Tree"
        subtitle="Help build a family tree from scratch."
      />
      <div className="dt-form-panel dt-form-panel--solo">
        <p className="dt-create-tree-lede">
          Start by adding the tree owner, then invite or add relatives. Full tree builder
          wiring will connect to DengiTree member APIs.
        </p>
        <div className="dt-create-tree-placeholder" aria-hidden="true">
          <span>Family tree builder</span>
        </div>
      </div>
    </>
  )
}
