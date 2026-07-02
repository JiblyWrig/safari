'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { mp, type ChatMsg } from '@/lib/multiplayer'
import { useGame } from '@/lib/store'
import { MessageSquare, Send } from 'lucide-react'

function useMpChat() {
  const [chat, setChat] = useState<ChatMsg[]>(() => [...mp.chat])
  useEffect(() => {
    const update = () => setChat([...mp.chat])
    const off = mp.on(update)
    return () => {
      off()
    }
  }, [])
  return chat
}

export function ChatPanel() {
  const chat = useMpChat()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const mode = useGame((s) => s.mode)
  const playerName = useGame((s) => s.player.name)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chat, open])

  if (mode !== 'multi') return null

  const send = () => {
    const t = text.trim()
    if (!t) return
    mp.sendChat(t)
    setText('')
  }

  return (
    <div className="pointer-events-auto absolute bottom-4 right-3 sm:right-4 z-20 w-[300px] max-w-[80vw]">
      {!open ? (
        <Button
          variant="secondary"
          size="sm"
          className="bg-amber-900/80 hover:bg-amber-800 text-amber-50 border-amber-700/50 backdrop-blur-sm shadow-lg"
          onClick={() => setOpen(true)}
        >
          <MessageSquare className="w-4 h-4 mr-1" />
          Chat
          {chat.length > 0 && (
            <span className="ml-1 bg-amber-600 text-amber-50 rounded-full px-1.5 text-[10px]">
              {chat.length}
            </span>
          )}
        </Button>
      ) : (
        <div className="bg-black/60 backdrop-blur-md rounded-xl border border-amber-900/40 shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-amber-900/30 bg-amber-950/40">
            <span className="text-amber-100 text-xs font-semibold flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              Safari Chat
            </span>
            <button
              className="text-amber-200/60 hover:text-amber-100 text-sm leading-none"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>
          <ScrollArea className="h-44 px-2">
            <div ref={scrollRef} className="py-2 space-y-1.5 max-h-44 overflow-y-auto">
              {chat.length === 0 ? (
                <p className="text-amber-200/40 text-xs text-center py-6">
                  No messages yet. Say hullo!
                </p>
              ) : (
                chat.map((m) => {
                  const mine = m.name === playerName
                  return (
                    <div key={m.id} className="text-xs leading-snug">
                      <span
                        className={`font-semibold ${
                          mine ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {m.name}:
                      </span>{' '}
                      <span className="text-amber-50/90 break-words">
                        {m.content}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
          <div className="flex gap-1 p-2 border-t border-amber-900/30 bg-amber-950/30">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Type a message…"
              maxLength={200}
              className="h-8 bg-black/40 border-amber-900/40 text-amber-50 placeholder:text-amber-200/30 text-xs"
            />
            <Button
              size="sm"
              className="h-8 px-2 bg-amber-700 hover:bg-amber-600 text-amber-50"
              onClick={send}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
