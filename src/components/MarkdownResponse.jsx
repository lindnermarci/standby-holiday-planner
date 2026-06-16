/**
 * Renders a Gemini markdown response into readable JSX.
 * Handles: # ## ### headings, **bold**, *italic*, - bullet lists, 1. numbered lists, --- dividers, blank lines.
 */
export default function MarkdownResponse({ text, className = '' }) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') { i++; continue }

    if (line.startsWith('---')) {
      elements.push(<hr key={i} className="my-3 border-slate-200" />)
      i++; continue
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={i} className="text-sm font-bold text-slate-800 mt-4 mb-1 first:mt-0">
          {renderInline(line.slice(4))}
        </h4>
      )
      i++; continue
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-base font-bold text-klm-dark mt-5 mb-1.5 first:mt-0">
          {renderInline(line.slice(3))}
        </h3>
      )
      i++; continue
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={i} className="text-lg font-extrabold text-klm-dark mt-5 mb-2 first:mt-0">
          {renderInline(line.slice(2))}
        </h2>
      )
      i++; continue
    }

    // Bullet list — collect consecutive
    if (line.match(/^[-*•]\s/)) {
      const bullets = []
      while (i < lines.length && lines[i].match(/^[-*•]\s/)) {
        bullets.push(<li key={i} className="text-sm text-slate-700 leading-relaxed">{renderInline(lines[i].slice(2))}</li>)
        i++
      }
      elements.push(<ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2 pl-1">{bullets}</ul>)
      continue
    }

    // Numbered list — collect consecutive
    if (line.match(/^\d+\.\s/)) {
      const items = []
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        items.push(<li key={i} className="text-sm text-slate-700 leading-relaxed">{renderInline(lines[i].replace(/^\d+\.\s/, ''))}</li>)
        i++
      }
      elements.push(<ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-2 pl-1">{items}</ol>)
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-klm-blue pl-3 my-2 text-sm italic text-slate-600">
          {renderInline(line.slice(2))}
        </blockquote>
      )
      i++; continue
    }

    // Paragraph
    elements.push(
      <p key={i} className="text-sm text-slate-700 leading-relaxed my-1.5">
        {renderInline(line)}
      </p>
    )
    i++
  }

  return <div className={`space-y-0.5 ${className}`}>{elements}</div>
}

function renderInline(text) {
  // Split on **bold**, *italic*, and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx} className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx} className="italic">{part.slice(1, -1)}</em>
    }
    return part
  })
}
