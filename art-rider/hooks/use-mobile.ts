// Hook que detecta si el dispositivo es mobile

import * as React from "react"

//  Breakpoints para determinar si es mobile
const MOBILE_BREAKPOINT = 768

// Hook que detecta si el dispositivo es mobile
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  // Se ejecuta cuando el componente se monta para evitar problemas de hidratación
  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Función que actualiza el estado de isMobile
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Se ejecuta cuando el componente se monta para evitar problemas de hidratación
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Retorna true si el dispositivo es mobile
  return !!isMobile
}
