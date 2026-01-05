'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import { BarChart3, TrendingUp } from 'lucide-react'

interface ReportRendererProps {
  content: string
}

export function ReportRenderer({ content }: ReportRendererProps) {
  // 그래프 데이터 파싱 (예: "보험료 대비 보장 효율" 섹션)
  const parseGraphData = (text: string) => {
    // "보험료 대비 보장 효율" 또는 "가성비" 섹션 찾기
    const graphSection = text.match(/(?:보험료 대비 보장 효율|가성비)[^]*?(?=\n\n##|\n#|$)/s)
    if (!graphSection) return null

    const lines = graphSection[0].split('\n')
    const data: Array<{ name: string; value: number }> = []
    
    lines.forEach(line => {
      // "상품명: (숫자%)" 또는 "상품명: (숫자%)" 형식 파싱
      const match = line.match(/(.+?):\s*\(?(\d+)%\)?/)
      if (match) {
        const name = match[1].trim()
        const value = parseInt(match[2])
        if (!isNaN(value) && value >= 0 && value <= 100) {
          data.push({ name, value })
        }
      }
    })

    return data.length > 0 ? data : null
  }

  const graphData = parseGraphData(content)

  // 커스텀 컴포넌트
  const components = {
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-6">
        <table className="min-w-full border-collapse bg-white shadow-md rounded-lg overflow-hidden">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => (
      <tbody className="divide-y divide-gray-200">
        {children}
      </tbody>
    ),
    th: ({ children, ...props }: any) => (
      <th
        {...props}
        className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-white"
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td
        {...props}
        className="px-6 py-4 text-sm text-gray-700"
      >
        {children}
      </td>
    ),
    tr: ({ children, ...props }: any) => (
      <tr
        {...props}
        className="hover:bg-blue-50 transition-colors duration-150"
      >
        {children}
      </tr>
    ),
    h1: ({ children }: any) => (
      <h1 className="text-4xl font-bold mb-6 mt-10 text-gray-900 border-b-4 border-blue-500 pb-3 flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-blue-600" />
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-2xl font-semibold mb-5 mt-8 text-gray-800 flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-indigo-600" />
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-xl font-semibold mb-4 mt-6 text-gray-700">
        {children}
      </h3>
    ),
    p: ({ children }: any) => (
      <p className="mb-4 text-gray-700 leading-relaxed">
        {children}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul className="mb-6 ml-6 space-y-2 list-disc list-inside text-gray-700">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="mb-6 ml-6 space-y-2 list-decimal list-inside text-gray-700">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="mb-1">
        {children}
      </li>
    ),
    strong: ({ children }: any) => (
      <strong className="font-bold text-gray-900">
        {children}
      </strong>
    ),
    code: ({ children }: any) => (
      <code className="bg-indigo-50 text-indigo-800 px-2 py-1 rounded text-sm font-mono border border-indigo-200">
        {children}
      </code>
    ),
    pre: ({ children }: any) => (
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-6 border border-gray-700">
        {children}
      </pre>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-blue-500 pl-6 py-2 my-6 italic text-gray-600 bg-blue-50 rounded-r-lg">
        {children}
      </blockquote>
    ),
  }

  return (
    <div className="report-wrapper">
      <ReactMarkdown components={components}>
        {content}
      </ReactMarkdown>
      
      {/* 그래프 시각화 */}
      {graphData && (
        <div className="my-10 p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border-2 border-blue-300 shadow-xl">
          <h3 className="text-2xl md:text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-md">
              <BarChart3 className="h-7 w-7 text-white" />
            </div>
            보험료 대비 보장 효율 (가성비)
          </h3>
          <div className="space-y-6 md:space-y-8">
            {graphData.map((item, index) => {
              const colors = [
                { from: 'from-blue-500', to: 'to-blue-600', bg: 'bg-blue-500' },
                { from: 'from-indigo-500', to: 'to-indigo-600', bg: 'bg-indigo-500' },
                { from: 'from-purple-500', to: 'to-purple-600', bg: 'bg-purple-500' },
                { from: 'from-pink-500', to: 'to-pink-600', bg: 'bg-pink-500' },
                { from: 'from-emerald-500', to: 'to-emerald-600', bg: 'bg-emerald-500' },
              ]
              const color = colors[index % colors.length]
              
              return (
                <div key={index} className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <span className="text-base md:text-lg font-semibold text-gray-800 break-words">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${color.bg} shadow-md`}>
                        {item.value}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-10 md:h-12 bg-gray-200 rounded-full overflow-hidden shadow-inner border border-gray-300">
                    <div
                      className={`h-full bg-gradient-to-r ${color.from} ${color.to} rounded-full transition-all duration-1000 ease-out shadow-lg flex items-center justify-end pr-4 relative`}
                      style={{ width: `${item.value}%` }}
                    >
                      {item.value >= 20 && (
                        <span className="text-white text-sm md:text-base font-bold drop-shadow-md">
                          {item.value}%
                        </span>
                      )}
                      {item.value < 20 && (
                        <span className="absolute right-4 text-gray-700 text-sm md:text-base font-bold">
                          {item.value}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

