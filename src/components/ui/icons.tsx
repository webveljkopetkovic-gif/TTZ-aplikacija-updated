import type { SVGProps } from 'react'

const base: SVGProps<SVGSVGElement> = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const HomeIcon = () => (
  <svg {...base}>
    <path d="M3 11 12 3l9 8v10H3z" />
  </svg>
)
export const LeafIcon = () => (
  <svg {...base}>
    <path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15Zm0 0 8-8" />
  </svg>
)
export const DumbbellIcon = () => (
  <svg {...base}>
    <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />
  </svg>
)
export const QuestionIcon = () => (
  <svg {...base}>
    <path d="M4 4h16v12H9l-5 4zM10 8.5a2 2 0 1 1 3 1.7c-.7.4-1 .8-1 1.3" />
  </svg>
)
export const ClipboardIcon = () => (
  <svg {...base}>
    <path d="M9 4h6v3H9zM7 5H5v16h14V5h-2M8.5 14l2.5 2.5 4.5-5" />
  </svg>
)
export const GridIcon = () => (
  <svg {...base}>
    <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
  </svg>
)
export const FileIcon = () => (
  <svg {...base}>
    <path d="M6 3h8l4 4v14H6zM9 13h6M9 17h6" />
  </svg>
)
export const FolderIcon = () => (
  <svg {...base}>
    <path d="M3 6h7l2 2h9v11H3z" />
  </svg>
)
