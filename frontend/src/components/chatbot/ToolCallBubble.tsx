import { motion } from 'framer-motion'
import type { ToolCall } from '../../services/chatbot'

const toolStyles: Record<string, { icon: string; className: string }> = {
  weather: { icon: '🌊', className: 'tool-call-tag weather' },
  marine_weather: { icon: '🌊', className: 'tool-call-tag weather' },
  wave: { icon: '🌊', className: 'tool-call-tag weather' },
  route: { icon: '🗺️', className: 'tool-call-tag route' },
  routing: { icon: '🗺️', className: 'tool-call-tag route' },
  geofence: { icon: '🛡️', className: 'tool-call-tag geofence' },
  eez: { icon: '🛡️', className: 'tool-call-tag geofence' },
  pfz: { icon: '🐟', className: 'tool-call-tag pfz' },
  pfz_synthesis: { icon: '🐟', className: 'tool-call-tag pfz' },
  cyclone: { icon: '🌀', className: 'tool-call-tag weather' },
  lightning: { icon: '⚡', className: 'tool-call-tag weather' },
  tide: { icon: '🌙', className: 'tool-call-tag weather' },
  vessel: { icon: '🚢', className: 'tool-call-tag route' },
  sst: { icon: '🌡️', className: 'tool-call-tag pfz' },
}

function getToolStyle(tool: string) {
  const key = Object.keys(toolStyles).find((k) =>
    tool.toLowerCase().includes(k)
  )
  return toolStyles[key || ''] || { icon: '🔧', className: 'tool-call-tag' }
}

export default function ToolCallBubble({ toolCall }: { toolCall: ToolCall }) {
  const style = getToolStyle(toolCall.tool)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={style.className}
    >
      <span className="text-sm">{toolCall.icon || style.icon}</span>
      <span className="font-semibold">{toolCall.label}</span>
      {toolCall.result_summary && (
        <>
          <span className="text-current/40">—</span>
          <span>{toolCall.result_summary}</span>
        </>
      )}
    </motion.div>
  )
}
