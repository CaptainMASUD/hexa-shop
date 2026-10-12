import { useState, useEffect, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  AiChat02Icon,
  Cancel01Icon,
  ChatBotIcon,
  RefreshIcon,
  SentIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ArrowRight01Icon,
  ShoppingBag01Icon,
} from '@hugeicons/core-free-icons'
import { sendChatMessage } from '../api/chatbot.api'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'

const INITIAL_GREETING = {
  id: 'init-greeting',
  role: 'model',
  content:
    'Hi! I am the **HEXA Assistant**, your AI helper for digital products, personalized recommendations, wallet credits, and subscriptions. How can I assist you today?',
  timestamp: new Date(),
}

const QUICK_PROMPTS = [
  'I want to purchase a Netflix subscription',
  'What do you recommend for me?',
  'What are the popular digital products?',
  'What payment options are supported?',
  'How do I buy wallet credits?',
  'Where can I find my active subscriptions?',
]

export default function HexaAssistant() {
  const { user, isAuthenticated } = useAuth()
  const cart = useCart()
  const location = useLocation()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('hexa_chat_history')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }))
        }
      }
    } catch {
      // ignore
    }
    return [INITIAL_GREETING]
  })

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showTooltip, setShowTooltip] = useState(true)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Save conversation to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('hexa_chat_history', JSON.stringify(messages))
    } catch {
      // ignore
    }
  }, [messages])

  // Scroll to bottom when messages change or panel opens
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, isOpen])

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInput(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const handleClearChat = () => {
    const freshGreeting = {
      ...INITIAL_GREETING,
      id: `greeting-${Date.now()}`,
      content: isAuthenticated
        ? `Hi **${user?.name || 'there'}**! How can I assist you with personalized product recommendations, available plans, or orders today?`
        : INITIAL_GREETING.content,
      timestamp: new Date(),
    }
    setMessages([freshGreeting])
    try {
      sessionStorage.removeItem('hexa_chat_history')
    } catch {}
  }

  const handleSendMessage = async (textToSend = null) => {
    const query = String(textToSend || input).trim()
    if (!query || loading) return

    setShowTooltip(false)
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date(),
    }

    // Build recent history payload (exclude initial/error messages, max 10)
    const historyPayload = messages
      .filter((m) => !m.isError && m.id !== 'init-greeting')
      .slice(-10)
      .map((m) => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content,
      }))

    // Extract cart product IDs
    const cartProductIds = (cart?.items || [])
      .map((item) => item.productId)
      .filter(Boolean)

    // Extract guest viewed product IDs from sessionStorage
    let guestViewProductIds = []
    try {
      guestViewProductIds = JSON.parse(sessionStorage.getItem('hexa_guest_views') || '[]')
    } catch {}

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    try {
      const response = await sendChatMessage({
        message: query,
        history: historyPayload,
        page: location.pathname,
        cartProductIds,
        guestViewProductIds,
      })

      const botReply = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content:
          response?.message ||
          "I'm here to help with your HEXA store questions. Please let me know what you need!",
        products: Array.isArray(response?.products) ? response.products : [],
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botReply])
    } catch (err) {
      let errorMessage = 'The HEXA Assistant is temporarily unreachable. Please check that the AI service is running or try again shortly.'
      const detail = err?.response?.data?.detail
      if (typeof detail === 'string') {
        errorMessage = detail
      } else if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail.map((d) => (typeof d === 'string' ? d : d?.msg || 'Validation error')).join(', ')
      } else if (typeof err?.response?.data?.message === 'string') {
        errorMessage = err.response.data.message
      } else if (err?.message) {
        errorMessage = err.message
      }

      const errorReply = {
        id: `bot-err-${Date.now()}`,
        role: 'model',
        content: errorMessage,
        timestamp: new Date(),
        isError: true,
      }

      setMessages((prev) => [...prev, errorReply])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      {/* Expanded Chat Widget with 100% Solid Non-Transparent Background */}
      {isOpen && (
        <div className="mb-3.5 flex flex-col w-[calc(100vw-2rem)] sm:w-[430px] h-[610px] max-h-[calc(100vh-6.5rem)] rounded-2xl border border-purple-500/30 bg-white dark:bg-[#0c0c12] text-[#17151d] dark:text-[#f7f4ff] shadow-2xl shadow-purple-950/30 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-indigo-500/10 dark:from-purple-950/40 dark:via-[#11101a] dark:to-indigo-950/30 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-sm">
                <HugeiconsIcon icon={AiChat02Icon} size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">HEXA Assistant</h3>
                  <span className="rounded-md bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                    AI
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Store support, product search & plans
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                title="Reset conversation"
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white transition"
              >
                <HugeiconsIcon icon={RefreshIcon} size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white transition"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={17} />
              </button>
            </div>
          </div>

          {/* Security & Context Banner */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#12111d] px-3.5 py-1.5 text-[11px]">
            <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
              <HugeiconsIcon icon={ShieldCheckIcon} size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Safe AI — Verified catalog & protected credentials</span>
            </span>
            {isAuthenticated ? (
              <span className="font-semibold text-purple-700 dark:text-purple-300 truncate max-w-[120px]">
                {user?.name?.split(' ')[0] || 'Member'}
              </span>
            ) : (
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Guest mode</span>
            )}
          </div>

          {/* Messages Stream with Solid Opaque Background */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-[#f8f9fc] dark:bg-[#0e0d16]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/15 dark:text-purple-400 mt-0.5 shadow-xs">
                    <HugeiconsIcon icon={ChatBotIcon} size={15} />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-xs'
                      : msg.isError
                      ? 'bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800/40 dark:text-rose-300 rounded-bl-xs'
                      : 'bg-white text-gray-900 border border-gray-200/80 dark:bg-[#181724] dark:text-[#f7f4ff] dark:border-white/10 rounded-bl-xs'
                  }`}
                >
                  <FormattedMessage content={msg.content} />

                  {/* Render Structured Product Cards with Available Plans */}
                  {Array.isArray(msg.products) && msg.products.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-purple-500/15 dark:border-white/10 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                          Available Store Plans ({msg.products.length})
                        </span>
                        <Link
                          to="/products"
                          className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                        >
                          See all <HugeiconsIcon icon={ArrowRight01Icon} size={10} />
                        </Link>
                      </div>

                      <div className="flex flex-col gap-2">
                        {msg.products.map((prod) => (
                          <div
                            key={prod.id || prod.slug}
                            className="rounded-xl border border-purple-200/80 dark:border-purple-500/20 bg-purple-50/50 dark:bg-purple-950/20 p-2.5 text-left transition shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5">
                              {prod.image ? (
                                <img
                                  src={prod.image}
                                  alt={prod.name}
                                  className="h-11 w-11 shrink-0 rounded-lg object-cover border border-purple-200 dark:border-purple-500/30 bg-gray-100 dark:bg-gray-800"
                                />
                              ) : (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-purple-200/60 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                                  HEXA
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <Link
                                    to={prod.url || `/product/${prod.slug}`}
                                    className="truncate text-xs font-bold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-300"
                                  >
                                    {prod.name}
                                  </Link>
                                  <span className="shrink-0 text-xs font-extrabold text-purple-700 dark:text-purple-400">
                                    ৳{prod.price}
                                  </span>
                                </div>
                                <div className="mt-0.5 flex items-center justify-between gap-1">
                                  <span className="truncate text-[10px] text-gray-600 dark:text-gray-400 font-medium">
                                    {prod.category}
                                  </span>
                                  <Link
                                    to={prod.url || `/product/${prod.slug}`}
                                    className="shrink-0 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 hover:underline"
                                  >
                                    Select Plan <HugeiconsIcon icon={ArrowRight01Icon} size={10} />
                                  </Link>
                                </div>
                              </div>
                            </div>

                            {/* Available Plans Tiers */}
                            {Array.isArray(prod.availablePlans) && prod.availablePlans.length > 0 && (
                              <div className="mt-2 pt-1.5 border-t border-purple-200/50 dark:border-white/5 flex flex-wrap gap-1">
                                {prod.availablePlans.slice(0, 4).map((plan, planIdx) => (
                                  <Link
                                    key={plan.id || planIdx}
                                    to={prod.url || `/product/${prod.slug}`}
                                    className="rounded-md bg-white dark:bg-[#161522] border border-purple-200/80 dark:border-white/10 px-1.5 py-0.5 text-[9px] font-medium text-gray-800 dark:text-gray-200 hover:border-purple-500 transition shadow-2xs"
                                  >
                                    <span className="font-semibold text-purple-700 dark:text-purple-300">
                                      {plan.duration || plan.name}:
                                    </span>{' '}
                                    ৳{plan.price}
                                  </Link>
                                ))}
                              </div>
                            )}

                            {prod.reason && (
                              <span className="mt-1.5 inline-block truncate rounded-md bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.5 text-[9px] font-medium text-purple-800 dark:text-purple-200 max-w-full">
                                ✨ {prod.reason}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Navigation Link Option */}
                      <Link
                        to="/products"
                        className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 py-1.5 px-3 text-[11px] font-bold transition"
                      >
                        <HugeiconsIcon icon={ShoppingBag01Icon} size={13} />
                        <span>Explore full store catalog</span>
                        <HugeiconsIcon icon={ArrowRight01Icon} size={11} />
                      </Link>
                    </div>
                  )}

                  {msg.isError && (
                    <button
                      type="button"
                      onClick={() => {
                        const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                        if (lastUserMsg) handleSendMessage(lastUserMsg.content);
                      }}
                      className="mt-2 flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:underline cursor-pointer"
                    >
                      <HugeiconsIcon icon={RefreshIcon} size={12} />
                      <span>Retry response</span>
                    </button>
                  )}
                  <span
                    className={`block mt-1 text-[10px] ${
                      msg.role === 'user'
                        ? 'text-purple-100 text-right'
                        : 'text-gray-400 dark:text-gray-400 text-left'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2.5 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/15 dark:text-purple-400">
                  <HugeiconsIcon icon={ChatBotIcon} size={15} />
                </div>
                <div className="rounded-2xl rounded-bl-xs border border-gray-200 bg-white dark:border-white/10 dark:bg-[#181724] px-4 py-3 text-purple-600 dark:text-purple-400">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-600 dark:bg-purple-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-600 dark:bg-purple-400 [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-600 dark:bg-purple-400 [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions (High contrast in Light & Dark Mode) */}
          {messages.length <= 1 && (
            <div className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#13121f] px-3.5 py-2.5">
              <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Suggested topics:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="rounded-lg border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 hover:border-purple-300 dark:border-purple-500/30 dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-900/60 dark:hover:text-white px-2.5 py-1 text-[11px] font-medium transition shadow-2xs cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Composer Input Area with Solid Background */}
          <div className="border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c0c12] p-3">
            <div className="relative flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#161522] p-1.5 focus-within:border-purple-500 dark:focus-within:border-purple-400 focus-within:bg-white dark:focus-within:bg-[#1a1928] focus-within:ring-2 focus-within:ring-purple-500/10 transition">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask for Netflix, Canva, ChatGPT, orders, wallet..."
                className="w-full resize-none bg-transparent px-2.5 py-1.5 text-xs text-gray-900 dark:text-[#f7f4ff] placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none max-h-28 font-medium"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                title="Send message"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white shadow-md shadow-purple-600/30 hover:bg-purple-500 disabled:opacity-40 transition cursor-pointer"
              >
                <HugeiconsIcon icon={SentIcon} size={15} />
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-gray-500 dark:text-gray-400">
              <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for line break</span>
              <span className="font-mono">{input.length}/4000</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button & Tooltip */}
      <div className="flex items-center gap-2.5">
        {!isOpen && showTooltip && (
          <div
            onClick={() => {
              setIsOpen(true)
              setShowTooltip(false)
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setIsOpen(true)
                setShowTooltip(false)
              }
            }}
            className="group/tooltip hidden sm:flex items-center gap-2.5 rounded-2xl border border-purple-200/80 dark:border-purple-500/25 bg-white/95 dark:bg-[#0d0c15]/95 backdrop-blur-xl text-gray-800 dark:text-gray-100 pl-3 pr-2 py-2 text-xs font-medium shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)] hover:border-purple-500/40 hover:scale-[1.015] active:scale-[0.99] transition-all duration-200 cursor-pointer select-none"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <HugeiconsIcon icon={SparklesIcon} size={13} />
            </span>
            <span className="text-[12px] font-normal leading-tight text-gray-600 dark:text-gray-300">
              Looking for a subscription? Chat with{' '}
              <strong className="font-semibold text-purple-600 dark:text-purple-400">HEXA AI</strong>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowTooltip(false)
              }}
              aria-label="Close tooltip"
              className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200/60 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-200 transition-colors cursor-pointer ml-0.5"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={12} />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setIsOpen((prev) => !prev)
            setShowTooltip(false)
          }}
          aria-label="Open HEXA Assistant Chat"
          className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-purple-400/40 bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-900/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          {/* Ambient Glow Pulse */}
          <span className="absolute -inset-1 rounded-full bg-purple-500/30 blur-sm group-hover:bg-purple-500/50 transition" />

          <div className="relative flex items-center justify-center">
            {isOpen ? (
              <HugeiconsIcon icon={Cancel01Icon} size={22} className="transition-transform duration-200 rotate-90 group-hover:rotate-180" />
            ) : (
              <HugeiconsIcon icon={AiChat02Icon} size={24} className="transition-transform group-hover:scale-110" />
            )}
          </div>
        </button>
      </div>
    </div>
  )
}

/**
 * Enhanced Message Text Formatter supporting Markdown links [text](url), bolding, bullet points, and numbered lists.
 */
function FormattedMessage({ content }) {
  if (!content) return null

  const lines = String(content).split('\n')

  return (
    <div className="space-y-1.5">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />
        }

        // Heading 3
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={lineIdx} className="font-bold text-[13px] text-gray-900 dark:text-white pt-1">
              {formatInlineMarkdown(trimmed.slice(4))}
            </h4>
          )
        }

        // Heading 2
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={lineIdx} className="font-extrabold text-[13.5px] text-purple-700 dark:text-purple-300 pt-1">
              {formatInlineMarkdown(trimmed.slice(3))}
            </h3>
          )
        }

        // Bullet point formatting
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <div key={lineIdx} className="flex items-start gap-1.5 ml-1">
              <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
              <span>{formatInlineMarkdown(trimmed.replace(/^[*•-]\s+/, ''))}</span>
            </div>
          )
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
        if (numMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-1.5 ml-1">
              <span className="text-purple-600 dark:text-purple-400 font-bold text-[11px]">{numMatch[1]}.</span>
              <span>{formatInlineMarkdown(numMatch[2])}</span>
            </div>
          )
        }

        return <p key={lineIdx}>{formatInlineMarkdown(line)}</p>
      })}
    </div>
  )
}

/**
 * Parses inline Markdown including [Label](url) Router links, bold **text**, and `code`.
 */
function formatInlineMarkdown(text) {
  if (!text) return ''

  // Split by markdown links, bold text, and inline code
  const tokens = text.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*|`.*?`)/g)

  return tokens.map((token, i) => {
    // 1. Markdown Link: [Label](url)
    const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/)
    if (linkMatch) {
      const label = linkMatch[1]
      const url = linkMatch[2]

      if (url.startsWith('/') || !url.startsWith('http')) {
        return (
          <Link
            key={i}
            to={url}
            className="inline-flex items-center gap-1 font-bold text-purple-700 dark:text-purple-300 bg-purple-100/90 dark:bg-purple-950/60 border border-purple-300/80 dark:border-purple-500/40 px-2 py-0.5 rounded-lg shadow-2xs hover:bg-purple-200 dark:hover:bg-purple-900/80 hover:text-purple-900 dark:hover:text-white transition cursor-pointer my-0.5"
          >
            <span>{label}</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={11} className="inline ml-0.5 text-purple-600 dark:text-purple-400" />
          </Link>
        )
      }

      return (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-bold text-purple-700 dark:text-purple-300 bg-purple-100/90 dark:bg-purple-950/60 border border-purple-300/80 dark:border-purple-500/40 px-2 py-0.5 rounded-lg shadow-2xs hover:bg-purple-200 dark:hover:bg-purple-900/80 hover:text-purple-900 dark:hover:text-white transition cursor-pointer my-0.5"
        >
          <span>{label}</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={11} className="inline ml-0.5 text-purple-600 dark:text-purple-400" />
        </a>
      )
    }

    // 2. Bold text: **text**
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      return (
        <strong key={i} className="font-bold text-gray-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      )
    }

    // 3. Inline code: `code`
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={i}
          className="rounded-md bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/30 px-1 py-0.5 font-mono text-[11px]"
        >
          {token.slice(1, -1)}
        </code>
      )
    }

    return token
  })
}
