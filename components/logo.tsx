import { FileText } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

interface LogoProps {
  onLogoClick?: () => void
}

export default function Logo({ onLogoClick }: LogoProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  const handleClick = () => {
    if (onLogoClick) {
      onLogoClick()
    } else {
      router.push('/')
    }
  }
  
  return (
    <div 
      className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity" 
      onClick={handleClick}
    >
      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
      <h1 className="text-lg sm:text-xl font-semibold">Notes</h1>
    </div>
  )
}


