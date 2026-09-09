import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Alert02Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ChartBarLineIcon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Coins01Icon,
  CreditCardIcon,
  DashboardSpeed01Icon,
  EyeIcon,
  FireIcon,
  FlashIcon,
  HexagonIcon,
  Invoice01Icon,
  Layers01Icon,
  PackageIcon,
  RefreshIcon,
  Rocket01Icon,
  ShoppingBag01Icon,
  Tag01Icon,
  UserGroupIcon,
  Wallet02Icon,
} from '@hugeicons/core-free-icons'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { adminGet } from '../../api/admin.api'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import AdminPageHeader from '../../components/AdminPageHeader'
import StatusBadge from '../../components/StatusBadge'

// Color Palette for Charts
const COLORS = {
  purple: '#8b5cf6',
  purpleLight: '#a78bfa',
  purpleDark: '#6d28d9',
  emerald: '#10b981',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  rose: '#f43f5e',
  blue: '#3b82f6',
  indigo: '#6366f1',
}

const PIE_COLORS = [
  '#8b5cf6', // purple (delivered/completed)
  '#06b6d4', // cyan (processing)
  '#3b82f6', // blue (confirmed)
  '#f59e0b', // amber (pending)
  '#f43f5e', // rose (cancelled)
  '#ec4899', // pink (refunded)
]

export default function AdminDashboard() {
  const { notify } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [chartMetric, setChartMetric] = useState('revenue') // 'revenue' | 'orders' | 'both'
  const [chartType, setChartType] = useState('area') // 'area' | 'bar' | 'line'

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await adminGet('/dashboard')
      setData(res.data)
      if (isManual) notify('Dashboard metrics updated', 'success')
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to load dashboard data'), 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Process Sales Trend Data
  const trendData = useMemo(() => {
    if (!data?.salesTrends?.length) return []
    return data.salesTrends
  }, [data])

  // Process Order Status Data for Pie Chart
  const statusPieData = useMemo(() => {
    if (!data?.orderStatus) return []
    const mapping = {
      delivered: { label: 'Delivered', color: '#10b981' },
      processing: { label: 'Processing', color: '#06b6d4' },
      confirmed: { label: 'Confirmed', color: '#8b5cf6' },
      pending: { label: 'Pending Payment', color: '#f59e0b' },
      cancelled: { label: 'Cancelled', color: '#f43f5e' },
      refunded: { label: 'Refunded', color: '#ec4899' },
    }
    return Object.entries(data.orderStatus)
      .filter(([, count]) => count > 0)
      .map(([status, count], index) => ({
        name: mapping[status]?.label || status.toUpperCase(),
        value: count,
        color: mapping[status]?.color || PIE_COLORS[index % PIE_COLORS.length],
        rawStatus: status,
      }))
  }, [data])

  // Category Distribution Data
  const categoryData = useMemo(() => {
    if (!data?.categoryDistribution?.length) return []
    return data.categoryDistribution.map((c) => ({
      name: c.name,
      revenue: c.revenue,
      unitsSold: c.unitsSold,
    }))
  }, [data])

  // Summary Metrics calculations
  const totalRevenue = data?.totalRevenue || 0
  const revenueToday = data?.revenueToday || 0
  const revenueThisMonth = data?.revenueThisMonth || 0
  const totalOrders = data?.totalOrders || 0
  const totalCustomers = data?.totalCustomers || 0
  const activeCustomers = data?.activeUsers || 0
  const totalProducts = data?.totalProducts || 0
  const lowStock = data?.lowStockProducts || 0
  const outOfStock = data?.outOfStockProducts || 0
  const totalWalletCredits = data?.walletPulse?.totalCreditsInCirculation || 0
  const pendingCreditsCount = data?.walletPulse?.pendingPurchasesCount || 0

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--hexa-border)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
              <HugeiconsIcon icon={DashboardSpeed01Icon} size={14} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Executive Analytics
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--hexa-text)] sm:text-3xl">
            Live Business Overview
          </h1>
          <p className="mt-1 text-xs text-[var(--hexa-muted)]">
            Real-time performance metrics, sales velocity, order fulfillment streams, and inventory health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3.5 py-2 text-xs font-semibold text-[var(--hexa-text)] shadow-sm hover:bg-[var(--hexa-surface)] disabled:opacity-50 transition"
          >
            <HugeiconsIcon
              icon={RefreshIcon}
              size={14}
              className={refreshing ? 'animate-spin text-purple-400' : 'text-[var(--hexa-muted)]'}
            />
            <span>{refreshing ? 'Syncing...' : 'Live Refresh'}</span>
          </button>

          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-500 transition"
          >
            <HugeiconsIcon icon={Invoice01Icon} size={14} />
            <span>Process Orders</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Total Revenue */}
        <div className="hexa-card relative overflow-hidden p-5 shadow-sm border border-[var(--hexa-border)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--hexa-muted)]">
              Gross Verified Revenue
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
              <HugeiconsIcon icon={Coins01Icon} size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--hexa-text)]">
            ৳{totalRevenue.toLocaleString()}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--hexa-border)]/60 pt-2.5 text-[11px]">
            <span className="text-[var(--hexa-muted)]">
              Today:{' '}
              <strong className="text-emerald-400 font-bold">
                ৳{revenueToday.toLocaleString()}
              </strong>
            </span>
            <span className="text-[var(--hexa-muted)]">
              This Month:{' '}
              <strong className="text-purple-300 font-bold">
                ৳{revenueThisMonth.toLocaleString()}
              </strong>
            </span>
          </div>
        </div>

        {/* Metric 2: Total Orders */}
        <div className="hexa-card relative overflow-hidden p-5 shadow-sm border border-[var(--hexa-border)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--hexa-muted)]">
              Total Order Volume
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
              <HugeiconsIcon icon={Invoice01Icon} size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--hexa-text)]">
            {totalOrders.toLocaleString()}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--hexa-border)]/60 pt-2.5 text-[11px]">
            <span className="text-[var(--hexa-muted)]">
              Delivered:{' '}
              <strong className="text-emerald-400 font-bold">
                {data?.orderStatus?.delivered || 0}
              </strong>
            </span>
            <Link
              to="/admin/orders"
              className="font-semibold text-purple-400 hover:underline inline-flex items-center gap-0.5"
            >
              <span>Queue →</span>
            </Link>
          </div>
        </div>

        {/* Metric 3: Total Customers */}
        <div className="hexa-card relative overflow-hidden p-5 shadow-sm border border-[var(--hexa-border)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--hexa-muted)]">
              Customer Accounts
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <HugeiconsIcon icon={UserGroupIcon} size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--hexa-text)]">
            {totalCustomers.toLocaleString()}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--hexa-border)]/60 pt-2.5 text-[11px]">
            <span className="text-[var(--hexa-muted)]">
              Active Users:{' '}
              <strong className="text-emerald-400 font-bold">
                {activeCustomers.toLocaleString()}
              </strong>
            </span>
            <Link
              to="/admin/users"
              className="font-semibold text-purple-400 hover:underline"
            >
              Manage →
            </Link>
          </div>
        </div>

        {/* Metric 4: Catalog & Stock Pulse */}
        <div className="hexa-card relative overflow-hidden p-5 shadow-sm border border-[var(--hexa-border)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--hexa-muted)]">
              Catalog & Inventory
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <HugeiconsIcon icon={PackageIcon} size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--hexa-text)]">
            {totalProducts.toLocaleString()}{' '}
            <span className="text-xs font-normal text-[var(--hexa-muted)]">products</span>
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--hexa-border)]/60 pt-2.5 text-[11px]">
            <span className="text-amber-400 font-semibold">
              Low: <strong>{lowStock}</strong>
            </span>
            <span className="text-rose-400 font-semibold">
              Out of Stock: <strong>{outOfStock}</strong>
            </span>
            <Link to="/admin/inventory" className="font-semibold text-purple-400 hover:underline">
              Vault →
            </Link>
          </div>
        </div>
      </div>

      {/* Secondary Pulse Bar (Wallet & Live Ops) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              <HugeiconsIcon icon={Wallet02Icon} size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--hexa-muted)]">Customer Wallet Balance</p>
              <p className="text-lg font-black text-[var(--hexa-text)]">
                ৳{totalWalletCredits.toLocaleString()}
              </p>
            </div>
          </div>
          <Link
            to="/admin/wallet?tab=balances"
            className="text-xs font-bold text-purple-400 hover:underline"
          >
            Balances →
          </Link>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
              <HugeiconsIcon icon={Tag01Icon} size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--hexa-muted)]">Credit Purchase Queue</p>
              <p className="text-lg font-black text-[var(--hexa-text)]">
                {pendingCreditsCount}{' '}
                <span className="text-xs font-medium text-amber-400">
                  {pendingCreditsCount === 1 ? 'request pending' : 'requests pending'}
                </span>
              </p>
            </div>
          </div>
          <Link
            to="/admin/wallet?tab=credit_purchases"
            className="text-xs font-bold text-cyan-400 hover:underline"
          >
            Review →
          </Link>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--hexa-muted)]">Fulfillment Rate</p>
              <p className="text-lg font-black text-emerald-400">
                {totalOrders > 0
                  ? `${Math.round(((data?.orderStatus?.delivered || 0) / totalOrders) * 100)}%`
                  : '100%'}
              </p>
            </div>
          </div>
          <Link to="/admin/reports" className="text-xs font-bold text-emerald-400 hover:underline">
            Reports →
          </Link>
        </div>
      </div>

      {/* Main Charts Section (Visuals using Recharts) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Visual 1: 14-Day Sales Velocity & Orders Chart (2 Columns Wide) */}
        <div className="hexa-card p-6 lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--hexa-border)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={ChartBarLineIcon} size={16} className="text-purple-400" />
                <h3 className="font-bold text-base text-[var(--hexa-text)]">
                  Sales Velocity & Revenue Trend
                </h3>
              </div>
              <p className="text-xs text-[var(--hexa-muted)] mt-0.5">
                Continuous 14-day chronological performance timeline.
              </p>
            </div>

            {/* Interactive Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Metric Select */}
              <div className="inline-flex rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setChartMetric('revenue')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    chartMetric === 'revenue'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-[var(--hexa-muted)] hover:text-[var(--hexa-text)]'
                  }`}
                >
                  Revenue (৳)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('orders')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    chartMetric === 'orders'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-[var(--hexa-muted)] hover:text-[var(--hexa-text)]'
                  }`}
                >
                  Orders
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('both')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    chartMetric === 'both'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-[var(--hexa-muted)] hover:text-[var(--hexa-text)]'
                  }`}
                >
                  Both
                </button>
              </div>

              {/* Chart Style Select */}
              <div className="inline-flex rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  className={`rounded-lg px-2 py-1 font-semibold transition ${
                    chartType === 'area'
                      ? 'bg-[var(--hexa-card)] text-purple-400 border border-[var(--hexa-border)] shadow-xs'
                      : 'text-[var(--hexa-muted)] hover:text-[var(--hexa-text)]'
                  }`}
                >
                  Area
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`rounded-lg px-2 py-1 font-semibold transition ${
                    chartType === 'bar'
                      ? 'bg-[var(--hexa-card)] text-purple-400 border border-[var(--hexa-border)] shadow-xs'
                      : 'text-[var(--hexa-muted)] hover:text-[var(--hexa-text)]'
                  }`}
                >
                  Bar
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('line')}
                  className={`rounded-lg px-2 py-1 font-semibold transition ${
                    chartType === 'line'
                      ? 'bg-[var(--hexa-card)] text-purple-400 border border-[var(--hexa-border)] shadow-xs'
                      : 'text-[var(--hexa-muted)] hover:text-[var(--hexa-text)]'
                  }`}
                >
                  Line
                </button>
              </div>
            </div>
          </div>

          {/* Recharts Render Canvas */}
          <div className="h-72 w-full pt-2">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-[var(--hexa-muted)]">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent mr-2" />
                Rendering interactive visuals...
              </div>
            ) : trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-[var(--hexa-muted)]">
                No revenue records recorded in the selected window.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="displayDate"
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `৳${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    {chartMetric === 'both' && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="rgba(255,255,255,0.4)"
                        fontSize={11}
                        tickLine={false}
                      />
                    )}
                    <Tooltip content={<CustomChartTooltip />} />
                    {(chartMetric === 'revenue' || chartMetric === 'both') && (
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="sales"
                        name="Revenue"
                        stroke={COLORS.purple}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#revenueGrad)"
                      />
                    )}
                    {(chartMetric === 'orders' || chartMetric === 'both') && (
                      <Area
                        yAxisId={chartMetric === 'both' ? 'right' : 'left'}
                        type="monotone"
                        dataKey="orders"
                        name="Orders"
                        stroke={COLORS.cyan}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#ordersGrad)"
                      />
                    )}
                  </AreaChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="displayDate"
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `৳${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    {(chartMetric === 'revenue' || chartMetric === 'both') && (
                      <Bar
                        dataKey="sales"
                        name="Revenue"
                        fill={COLORS.purple}
                        radius={[6, 6, 0, 0]}
                      />
                    )}
                    {(chartMetric === 'orders' || chartMetric === 'both') && (
                      <Bar
                        dataKey="orders"
                        name="Orders"
                        fill={COLORS.cyan}
                        radius={[6, 6, 0, 0]}
                      />
                    )}
                  </BarChart>
                ) : (
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="displayDate"
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `৳${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    {(chartMetric === 'revenue' || chartMetric === 'both') && (
                      <Line
                        type="monotone"
                        dataKey="sales"
                        name="Revenue"
                        stroke={COLORS.purple}
                        strokeWidth={3}
                        dot={{ r: 3, fill: COLORS.purple }}
                      />
                    )}
                    {(chartMetric === 'orders' || chartMetric === 'both') && (
                      <Line
                        type="monotone"
                        dataKey="orders"
                        name="Orders"
                        stroke={COLORS.cyan}
                        strokeWidth={2}
                        dot={{ r: 3, fill: COLORS.cyan }}
                      />
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Visual 2: Order Status Distribution (Donut Pie Chart) */}
        <div className="hexa-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--hexa-border)] pb-4">
              <div>
                <h3 className="font-bold text-base text-[var(--hexa-text)]">
                  Order Status Ratio
                </h3>
                <p className="text-xs text-[var(--hexa-muted)] mt-0.5">
                  Fulfillment pipeline breakdown.
                </p>
              </div>
              <span className="rounded-lg bg-purple-500/10 px-2.5 py-1 text-[11px] font-bold text-purple-400">
                {totalOrders} Total
              </span>
            </div>

            <div className="h-52 w-full pt-2 relative flex items-center justify-center">
              {statusPieData.length === 0 ? (
                <p className="text-xs text-[var(--hexa-muted)]">No orders registered yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip total={totalOrders} />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Custom Status Legend List */}
          <div className="mt-2 space-y-1.5 border-t border-[var(--hexa-border)]/60 pt-3">
            {statusPieData.map((s) => {
              const pct = totalOrders > 0 ? Math.round((s.value / totalOrders) * 100) : 0
              return (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-[var(--hexa-text)] font-medium">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-[var(--hexa-text)]">{s.value}</span>
                    <span className="text-[10px] text-[var(--hexa-muted)]">({pct}%)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Visual 3 & 4: Category Distribution & Top Selling Products */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Revenue Bar Chart */}
        <div className="hexa-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--hexa-border)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Layers01Icon} size={16} className="text-purple-400" />
                <h3 className="font-bold text-base text-[var(--hexa-text)]">
                  Top Categories by Sales
                </h3>
              </div>
              <p className="text-xs text-[var(--hexa-muted)] mt-0.5">
                Marketplace category revenue generation.
              </p>
            </div>
            <Link
              to="/admin/categories"
              className="text-xs font-semibold text-purple-400 hover:underline"
            >
              Categories →
            </Link>
          </div>

          <div className="h-64 w-full pt-2">
            {categoryData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-[var(--hexa-muted)]">
                No category sales recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    type="number"
                    stroke="rgba(255,255,255,0.4)"
                    fontSize={11}
                    tickFormatter={(v) => `৳${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="rgba(255,255,255,0.7)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomCategoryTooltip />} />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill={COLORS.purple}
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Selling Products Leaderboard */}
        <div className="hexa-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--hexa-border)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={FireIcon} size={16} className="text-amber-400" />
                <h3 className="font-bold text-base text-[var(--hexa-text)]">
                  Top Selling Products
                </h3>
              </div>
              <p className="text-xs text-[var(--hexa-muted)] mt-0.5">
                Highest revenue-generating digital items.
              </p>
            </div>
            <Link
              to="/admin/products"
              className="text-xs font-semibold text-purple-400 hover:underline"
            >
              All Products →
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {!data?.topProducts?.length ? (
              <p className="py-8 text-center text-xs text-[var(--hexa-muted)]">
                No product sales recorded yet.
              </p>
            ) : (
              data.topProducts.map((p, idx) => (
                <div
                  key={p.name + idx}
                  className="flex items-center justify-between rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/60 p-3 hover:border-purple-500/30 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-xs font-black text-purple-400">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[var(--hexa-text)]">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-[var(--hexa-muted)]">
                        {p.unitsSold} {p.unitsSold === 1 ? 'unit sold' : 'units sold'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-xs text-emerald-400">
                      ৳{Number(p.revenue || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Operational Streams: Recent Orders & Recent Users */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders Table (2 Cols Wide) */}
        <div className="hexa-card p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--hexa-border)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={ShoppingBag01Icon} size={16} className="text-purple-400" />
                <h3 className="font-bold text-base text-[var(--hexa-text)]">Recent Orders</h3>
              </div>
              <p className="text-xs text-[var(--hexa-muted)] mt-0.5">
                Incoming orders awaiting fulfillment or completed.
              </p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-bold text-purple-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View All Orders</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--hexa-border)] text-[var(--hexa-muted)] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Order No.</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-center">Payment</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {!data?.recentOrders?.length ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-xs text-[var(--hexa-muted)]">
                      No recent orders.
                    </td>
                  </tr>
                ) : (
                  data.recentOrders.map((o) => (
                    <tr key={o._id} className="hover:bg-[var(--hexa-surface)] transition">
                      <td className="py-3 px-3 font-mono font-bold text-[var(--hexa-text)]">
                        {o.orderNumber}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-[var(--hexa-text)]">
                          {o.customer?.name || 'Customer'}
                        </p>
                        <p className="text-[11px] text-[var(--hexa-muted)]">{o.customer?.email}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[var(--hexa-text)]">
                        ৳{Number(o.total || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StatusBadge value={o.payment?.status || 'pending'} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StatusBadge value={o.status} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to="/admin/orders"
                          className="rounded-lg bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-400 hover:bg-purple-500/20 transition"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Customers List (1 Col) */}
        <div className="hexa-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--hexa-border)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={UserGroupIcon} size={16} className="text-emerald-400" />
                <h3 className="font-bold text-base text-[var(--hexa-text)]">New Customers</h3>
              </div>
              <p className="text-xs text-[var(--hexa-muted)] mt-0.5">
                Recently registered accounts.
              </p>
            </div>
            <Link
              to="/admin/users"
              className="text-xs font-semibold text-purple-400 hover:underline"
            >
              Users →
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {!data?.recentCustomers?.length ? (
              <p className="py-6 text-center text-xs text-[var(--hexa-muted)]">
                No customer accounts found.
              </p>
            ) : (
              data.recentCustomers.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/50 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 font-extrabold text-xs overflow-hidden border border-purple-500/30">
                      {c.avatar?.url ? (
                        <img
                          src={c.avatar.url}
                          alt={c.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{c.name ? c.name.charAt(0).toUpperCase() : 'U'}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[var(--hexa-text)]">{c.name}</p>
                      <p className="truncate text-[11px] text-[var(--hexa-muted)]">{c.email}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      ৳{Number(c.walletBalance || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   CUSTOM RECHARTS TOOLTIPS (Clean Glassmorphism Styling)
   ========================================================================= */

function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/95 p-3 shadow-xl backdrop-blur-md text-xs">
        <p className="font-bold text-[var(--hexa-text)] mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[var(--hexa-muted)]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color || entry.stroke }}
                />
                {entry.name}:
              </span>
              <strong className="font-bold text-[var(--hexa-text)]">
                {entry.name === 'Revenue'
                  ? `৳${Number(entry.value).toLocaleString()}`
                  : Number(entry.value).toLocaleString()}
              </strong>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

function CustomPieTooltip({ active, payload, total }) {
  if (active && payload && payload.length) {
    const data = payload[0]
    const pct = total > 0 ? Math.round((data.value / total) * 100) : 0
    return (
      <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/95 p-3 shadow-xl backdrop-blur-md text-xs">
        <p className="font-bold text-[var(--hexa-text)] flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: data.payload.color }} />
          {data.name}
        </p>
        <p className="mt-1 text-[var(--hexa-muted)]">
          Count: <strong className="text-[var(--hexa-text)]">{data.value}</strong> ({pct}%)
        </p>
      </div>
    )
  }
  return null
}

function CustomCategoryTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/95 p-3 shadow-xl backdrop-blur-md text-xs">
        <p className="font-bold text-[var(--hexa-text)]">{data.payload.name}</p>
        <p className="mt-1 text-[var(--hexa-muted)]">
          Revenue: <strong className="text-emerald-400">৳{Number(data.value).toLocaleString()}</strong>
        </p>
        {data.payload.unitsSold !== undefined && (
          <p className="text-[var(--hexa-muted)]">
            Units Sold: <strong className="text-purple-300">{data.payload.unitsSold}</strong>
          </p>
        )}
      </div>
    )
  }
  return null
}
