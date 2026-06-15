import Link from "next/link";

export default function ArtRiderLogo({ subtitle }: { subtitle?: string }) {
  return (
    <Link href="/" className="flex items-center gap-3 shrink-0">
      <div className="w-11 h-11 rounded-full border-2 border-gray-900 flex items-center justify-center shrink-0">
        <svg viewBox="-17 0 427 448" fill="currentColor" className="w-[22px] h-[22px] text-gray-900">
          <path d="M13.5 148C6.044 148 0 154.044 0 161.5v125c0 7.456 6.044 13.5 13.5 13.5S27 293.456 27 286.5v-125C27 154.044 20.956 148 13.5 148z"/>
          <path d="M74.5 101C67.044 101 61 107.044 61 114.5v219c0 7.456 6.044 13.5 13.5 13.5S88 340.456 88 333.5v-219C88 107.044 81.956 101 74.5 101z"/>
          <path d="M135.5 54C128.044 54 122 60.044 122 67.5v313c0 7.456 6.044 13.5 13.5 13.5S149 387.456 149 380.5V67.5C149 60.044 142.956 54 135.5 54z"/>
          <path d="M196.5 0C189.044 0 183 6.044 183 13.5v421c0 7.456 6.044 13.5 13.5 13.5S210 441.956 210 434.5V13.5C210 6.044 203.956 0 196.5 0z"/>
          <path d="M257.5 54C250.044 54 244 60.044 244 67.5v313c0 7.456 6.044 13.5 13.5 13.5S271 387.456 271 380.5V67.5C271 60.044 264.956 54 257.5 54z"/>
          <path d="M318.5 101C311.044 101 305 107.044 305 114.5v219c0 7.456 6.044 13.5 13.5 13.5S332 340.456 332 333.5v-219C332 107.044 325.956 101 318.5 101z"/>
          <path d="M379.5 148C372.044 148 366 154.044 366 161.5v125c0 7.456 6.044 13.5 13.5 13.5S393 293.456 393 286.5v-125C393 154.044 386.956 148 379.5 148z"/>
        </svg>
      </div>
      <span className="font-bold text-[1.08rem] text-gray-900 tracking-tight">
        ArtRider
        {subtitle && (
          <span className="font-medium text-gray-400">
            {" "}| {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
