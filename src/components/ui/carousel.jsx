import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"

const CarouselContext = React.createContext(null)

function useCarousel() {
    const context = React.useContext(CarouselContext)
    if (!context) {
        throw new Error("useCarousel must be used within a <Carousel />")
    }
    return context
}

export function Carousel({
    children,
    className,
    opts = {},
    setApi,
    ...props
}) {
    const [index, setIndex] = React.useState(0)
    const [itemsCount, setItemsCount] = React.useState(0)

    const scrollPrev = React.useCallback(() => {
        setIndex((prev) => (prev > 0 ? prev - 1 : prev))
    }, [])

    const scrollNext = React.useCallback(() => {
        setIndex((prev) => (prev < itemsCount - 1 ? prev + 1 : prev))
    }, [itemsCount])

    const api = React.useMemo(() => ({
        scrollPrev,
        scrollNext,
        canScrollPrev: index > 0,
        canScrollNext: index < itemsCount - 1,
    }), [scrollPrev, scrollNext, index, itemsCount])

    React.useEffect(() => {
        if (setApi) setApi(api)
    }, [api, setApi])

    return (
        <CarouselContext.Provider value={{
            index,
            setIndex,
            scrollPrev,
            scrollNext,
            itemsCount,
            setItemsCount,
            canScrollPrev: index > 0,
            canScrollNext: index < itemsCount - 1,
        }}>
            <div className={`relative ${className}`} role="region" aria-roledescription="carousel" {...props}>
                {children}
            </div>
        </CarouselContext.Provider>
    )
}

export function CarouselContent({ className, ...props }) {
    const { index } = useCarousel()

    return (
        <div className="overflow-hidden p-4 w-full">
            <motion.div
                animate={{ x: `-${index * 100}%` }}
                transition={{ type: "spring", damping: 25, stiffness: 150 }}
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    width: '100%'
                }}
                className={className}
                {...props}
            />
        </div>
    )
}

export function CarouselItem({ className, ...props }) {
    const { setItemsCount } = useCarousel()

    React.useEffect(() => {
        setItemsCount((prev) => prev + 1)
        return () => setItemsCount((prev) => Math.max(0, prev - 1))
    }, [setItemsCount])

    return (
        <div
            role="group"
            aria-roledescription="slide"
            className={`min-w-0 shrink-0 grow-0 basis-full px-2 ${className}`}
            {...props}
        />
    )
}

export function CarouselPrevious({ className, ...props }) {
    const { scrollPrev, canScrollPrev } = useCarousel()

    return (
        <button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className={`absolute left-[-3rem] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 hover:border-blue-500/50 transition-all ${className}`}
            {...props}
        >
            <ChevronLeft className="w-6 h-6" />
            <span className="sr-only">Previous slide</span>
        </button>
    )
}

export function CarouselNext({ className, ...props }) {
    const { scrollNext, canScrollNext } = useCarousel()

    return (
        <button
            onClick={scrollNext}
            disabled={!canScrollNext}
            className={`absolute right-[-3rem] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 hover:border-blue-500/50 transition-all ${className}`}
            {...props}
        >
            <ChevronRight className="w-6 h-6" />
            <span className="sr-only">Next slide</span>
        </button>
    )
}
