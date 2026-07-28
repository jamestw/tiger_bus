'use client'

export function DeleteSettlementButton({
  settlementId,
  driverName,
  month,
  deleteAction,
}: {
  settlementId: string
  driverName: string
  month: string
  deleteAction: (formData: FormData) => Promise<void>
}) {
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!confirm(`確定要刪除「${driverName}」${month} 的結算單嗎？此動作無法復原。`)) return
        await deleteAction(new FormData(e.currentTarget))
      }}
    >
      <input type="hidden" name="settlementId" value={settlementId} />
      <button className="btn btn-danger" type="submit">
        刪除
      </button>
    </form>
  )
}
