import * as React from "react"
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { TableIcon } from "@/components/tiptap-icons/table-icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const MAX_ROWS = 10
const MAX_COLS = 10

export const TableButton = () => {
  const editor = useTiptapEditor()
  const [isOpen, setIsOpen] = React.useState(false)
  const [gridSize, setGridSize] = React.useState({ rows: 0, cols: 0 })

  const handleSelect = (rows: number, cols: number) => {
    if (editor) {
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
      setIsOpen(false)
    }
  }

  const cells = Array.from({ length: MAX_ROWS * MAX_COLS }).map((_, index) => {
    const rowIndex = Math.floor(index / MAX_COLS)
    const colIndex = index % MAX_COLS
    
    const isHighlighted = rowIndex < gridSize.rows && colIndex < gridSize.cols
    
    return (
      <div
        key={index}
        onMouseOver={() => setGridSize({ rows: rowIndex + 1, cols: colIndex + 1 })}
        onClick={() => handleSelect(rowIndex + 1, colIndex + 1)}
        className={`w-5 h-5 border border-neutral-300 dark:border-neutral-700 cursor-pointer ${
          isHighlighted ? "bg-blue-300 dark:bg-blue-600" : "bg-white dark:bg-neutral-800"
        }`}
      />
    )
  })

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          data-active={editor?.isActive("table")}
          aria-label="Insert table"
        >
          <TableIcon className="tiptap-button-icon" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2" 
        onMouseLeave={() => setGridSize({ rows: 0, cols: 0 })}
        align="start"
      >
        <div className="grid grid-cols-10 gap-1 mb-2">
          {cells}
        </div>
        <div className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          {gridSize.rows > 0 && gridSize.cols > 0
            ? `${gridSize.cols} x ${gridSize.rows}`
            : "Select table size"}
        </div>
      </PopoverContent>
    </Popover>
  )
} 