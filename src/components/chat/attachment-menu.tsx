import { Paperclip, Image, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AttachmentMenuProps {
  isOpen: boolean
  onToggle: () => void
  onPhotoAttach: () => void
  onDocAttach: () => void
}

export function AttachmentMenu({ isOpen, onToggle, onPhotoAttach, onDocAttach }: AttachmentMenuProps) {
  return (
    <DropdownMenu open={isOpen} onOpenChange={(open) => { if (!open && isOpen) onToggle() }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label="Attach file"
          title="Attach"
          className="rounded-full w-10 h-10 text-muted-foreground"
        >
          <Paperclip className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-48">
        <DropdownMenuItem onClick={onPhotoAttach} className="gap-3 cursor-pointer">
          <Image className="w-4 h-4" />
          Photo / Video
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDocAttach} className="gap-3 cursor-pointer">
          <FileText className="w-4 h-4" />
          Document
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
