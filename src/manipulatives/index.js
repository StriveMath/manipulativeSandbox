import { createElement } from 'react'

function BlankSandbox() {
  return createElement(
    'div',
    {
      className:
        'flex h-[500px] w-[800px] items-center justify-center bg-slate-50 text-slate-500',
    },
    createElement('p', { className: 'text-lg font-semibold' }, 'Blank sandbox'),
  )
}

export const manipulatives = [
  {
    id: 'blank-sandbox',
    name: 'Blank Sandbox',
    component: BlankSandbox,
  },
]
