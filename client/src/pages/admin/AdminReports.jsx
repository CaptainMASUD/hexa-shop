import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Calendar01Icon,
  ChartBarLineIcon,
  Coins01Icon,
  Invoice01Icon,
  Layers01Icon,
  ShoppingBag01Icon,
} from '@hugeicons/core-free-icons'
import { adminGet } from '../../api/admin.api'
import AdminPageHeader from '../../components/AdminPageHeader'

export default function AdminReports() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sales, setSales] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    return Promise.all([
      adminGet('/reports/sales', { from, to }),
      adminGet('/reports/products', { from, to }),
      adminGet('/reports/categories', { from, to }),
    ])
      .then(([s, p, c]) => {
        setSales(s.data)
        setProducts(p.data || [])
        setCategories(c.data || [])
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    load().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <AdminPageHeader
        title="Reports & Analytics"
        description="Date-filtered sales, product and category performance powered by high-efficiency MongoDB aggregations."
      />

      {/* Filter Panel */}
      <div className="hexa-panel mb-6 flex flex-wrap items-end gap-3 p-4">
        <label className="flex-1 min-w-[150px]">
          <span className="hexa-label flex items-center gap-1">
            <HugeiconsIcon icon={Calendar01Icon} size={13} className="text-purple-400" />
            From
          </span>
          <input
            type="date"
            className="hexa-input text-xs"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="flex-1 min-w-[150px]">
          <span className="hexa-label flex items-center gap-1">
            <HugeiconsIcon icon={Calendar01Icon} size={13} className="text-purple-400" />
            To
          </span>
          <input
            type="date"
            className="hexa-input text-xs"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          onClick={load}
          disabled={loading}
          className="hexa-btn text-xs !py-2.5 !px-5"
        >
          {loading ? 'Calculating...' : 'Apply Range'}
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Total Verified Revenue"
          value={`৳${(sales?.summary?.totalSales || 0).toLocaleString()}`}
          icon={Coins01Icon}
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
        />
        <Stat
          label="Total Completed Orders"
          value={sales?.summary?.orders || 0}
          icon={Invoice01Icon}
          color="text-purple-400"
          bgColor="bg-purple-500/10"
        />
        <Stat
          label="Average Order Value"
          value={`৳${Math.round(sales?.summary?.averageOrderValue || 0).toLocaleString()}`}
          icon={ChartBarLineIcon}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
        />
      </div>

      {/* Tables Grid */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Table
          title="Top Performing Products"
          icon={ShoppingBag01Icon}
          rows={products}
          columns={[
            ['name', 'Product'],
            ['unitsSold', 'Units Sold'],
            ['revenue', 'Gross Revenue'],
          ]}
        />
        <Table
          title="Category Performance Breakdown"
          icon={Layers01Icon}
          rows={categories}
          columns={[
            ['name', 'Category'],
            ['unitsSold', 'Units Sold'],
            ['revenue', 'Gross Revenue'],
          ]}
        />
      </div>

      {/* Daily Sales Chart / List */}
      <section className="hexa-card mt-6 p-6">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={ChartBarLineIcon} size={18} className="text-purple-400" />
          <h2 className="font-bold text-sm text-[var(--hexa-text)]">Daily Sales Trajectory</h2>
        </div>
        <div className="mt-5 space-y-3">
          {sales?.daily?.length ? (
            sales.daily.map((item) => (
              <div
                key={item._id}
                className="grid grid-cols-[120px_1fr_auto] items-center gap-3 text-xs"
              >
                <span className="text-gray-400 font-mono">{item._id}</span>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        3,
                        Math.min(100, (item.sales / (sales.summary.totalSales || 1)) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <span className="font-bold text-[var(--hexa-text)]">
                  ৳{item.sales.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 py-4">No verified sales in this selected date range.</p>
          )}
        </div>
      </section>
    </>
  )
}

function Stat({ label, value, icon, color, bgColor }) {
  return (
    <div className="hexa-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${bgColor} ${color}`}>
          <HugeiconsIcon icon={icon} size={16} />
        </div>
      </div>
      <p className={`mt-3 text-2xl font-black ${color}`}>{value}</p>
    </div>
  )
}

function Table({ title, icon, rows, columns }) {
  return (
    <section className="hexa-card overflow-hidden">
      <div className="px-5 py-4 font-bold text-xs flex items-center gap-2 border-b border-white/5">
        <HugeiconsIcon icon={icon} size={15} className="text-purple-400" />
        <span>{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-white/10 bg-white/[0.02] text-gray-400 font-semibold">
            <tr>
              {columns.map(([, label]) => (
                <th key={label} className="px-5 py-3 text-left">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-6 text-center text-gray-500">
                  No data available for this range.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row._id || i} className="hover:bg-white/[0.02] transition">
                  {columns.map(([key]) => (
                    <td key={key} className="px-5 py-3">
                      {key === 'revenue'
                        ? `৳${Number(row[key] || 0).toLocaleString()}`
                        : row[key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
