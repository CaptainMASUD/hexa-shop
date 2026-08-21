import { Link } from 'react-router-dom'
import { BsHexagonFill } from 'react-icons/bs'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--hexa-border)] bg-[var(--hexa-bg-soft)]">
      <div className="hexa-container grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 text-xl font-bold text-[var(--hexa-text)]"><BsHexagonFill className="text-purple-600" />HEXA</div>
          <p className="mt-4 max-w-lg text-sm leading-6 text-[var(--hexa-muted)]">A secure digital marketplace for subscriptions, games, software, tools and future digital categories managed from one database-driven platform.</p>
        </div>
        <div>
          <h3 className="font-semibold">Marketplace</h3>
          <div className="mt-4 flex flex-col gap-2 text-sm text-[var(--hexa-muted)]">
            <Link className="transition hover:text-[var(--hexa-text)]" to="/products">All products</Link>
            <Link className="transition hover:text-[var(--hexa-text)]" to="/category/streaming">Streaming</Link>
            <Link className="transition hover:text-[var(--hexa-text)]" to="/category/gaming">Gaming</Link>
          </div>
        </div>
        <div>
          <h3 className="font-semibold">Account</h3>
          <div className="mt-4 flex flex-col gap-2 text-sm text-[var(--hexa-muted)]">
            <Link className="transition hover:text-[var(--hexa-text)]" to="/account">My purchases</Link>
            <Link className="transition hover:text-[var(--hexa-text)]" to="/cart">Cart</Link>
            <Link className="transition hover:text-[var(--hexa-text)]" to="/admin/login">Admin</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--hexa-border)] py-5 text-center text-xs text-[var(--hexa-subtle)]">© {new Date().getFullYear()} HEXA Digital Marketplace. Secure digital fulfillment.</div>
    </footer>
  )
}
