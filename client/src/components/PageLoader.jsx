import { BsHexagonFill } from 'react-icons/bs'

export default function PageLoader() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center bg-[var(--hexa-bg)] text-[var(--hexa-text)]">
      <div className="text-center">
        <BsHexagonFill className="mx-auto animate-pulse text-5xl text-purple-600" />
        <p className="mt-4 text-sm text-[var(--hexa-muted)]">Loading HEXA…</p>
      </div>
    </div>
  )
}
