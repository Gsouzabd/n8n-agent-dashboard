import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'
import { chatService } from '@/services/chatService'

interface AudioPlayerProps {
  messageId: string
  content: string
  role: string
  className?: string
}

export function AudioPlayer({ messageId, content, role, className = '' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string>('')

  // Check if message content is an audio URL
  const isAudioUrl = (content: string): boolean => {
    return content.startsWith('http') && (
      content.includes('voice-messages') ||
      content.match(/\.(webm|mp3|wav|ogg|m4a)(\?|$)/i)
    )
  }

  // Get audio URL for message (handles both URL and base64)
  useEffect(() => {
    // Check if it's base64 audio
    if (content.startsWith('__AUDIO_BASE64__:')) {
      const base64 = content.replace('__AUDIO_BASE64__:', '')
      const url = chatService.base64ToAudioUrl(base64)
      setAudioUrl(url)
    } else if (isAudioUrl(content)) {
      setAudioUrl(content)
    }
  }, [content])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [audioUrl])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!audioUrl) return null

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-3 p-2 bg-black/20 dark:bg-white/10 rounded-lg">
        <button
          onClick={togglePlay}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 flex items-center justify-center transition-all"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-orange-400" />
          ) : (
            <Play className="w-5 h-5 text-orange-400 ml-0.5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1 bg-gray-700 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        className="hidden"
      />
      <p className="text-xs opacity-60">
        {role === 'user' ? 'Mensagem de áudio' : 'Resposta de áudio'}
      </p>
    </div>
  )
}

