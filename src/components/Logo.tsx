import { cn } from "@/lib/utils"

interface LogoProps {
    className?: string
    iconSize?: number
    variant?: 'full' | 'icon'
}

export function Logo({ className, iconSize = 8, variant = 'full' }: LogoProps) {
    // Calculate pixel size based on tailwind spacing scale (roughly 4px per unit)
    const size = iconSize * 4

    // Aspect ratio adjustments
    // Icon only: square (e.g. 32x32)
    // Full logo: wider (e.g. 180x40)
    const width = variant === 'full' ? size * 4.5 : size
    const height = size
    const viewBox = variant === 'full' ? "0 0 180 40" : "0 0 40 40"

    return (
        <div className={cn("relative flex items-center justify-center select-none", className)}>
            <svg
                width={width}
                height={height}
                viewBox={viewBox}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-sm"
            >
                {variant === 'full' && (
                    <text
                        x="0"
                        y="28"
                        fontFamily="'Outfit', sans-serif"
                        fontWeight="700"
                        fontSize="32"
                        className="fill-slate-800 dark:fill-white transition-colors duration-300"
                        letterSpacing="-1"
                    >
                        wallet.
                    </text>
                )}

                {/* Padlock Icon - positioned as the 'o' */}
                <g transform={variant === 'full' ? "translate(105, 4)" : "translate(4, 4)"}>
                    {/* Shackle and Body (Primary Color) */}
                    <path
                        d="M16 2C11.5817 2 8 5.58172 8 10V14H6C4.89543 14 4 14.8954 4 16V28C4 29.1046 4.89543 30 6 30H26C27.1046 30 28 29.1046 28 28V16C28 14.8954 27.1046 14 26 14H24V10C24 5.58172 20.4183 2 16 2ZM12 10V14H20V10C20 7.79086 18.2091 6 16 6C13.7909 6 12 7.79086 12 10Z"
                        // Using fill-primary for the padlock body
                        className="fill-primary transition-colors duration-300"
                    />
                    {/* Keyhole (Background Color) */}
                    <path
                        d="M16 19C14.8954 19 14 19.8954 14 21C14 21.7403 14.4022 22.3866 15 22.7324V25C15 25.5523 15.4477 26 16 26C16.5523 26 17 25.5523 17 25V22.7324C17.5978 22.3866 18 21.7403 18 21C18 19.8954 17.1046 19 16 19Z"
                        // Using fill-background for the keyhole (white in light mode, dark in dark mode)
                        fill="hsl(var(--background))"
                        className="transition-colors duration-300"
                    />
                </g>
            </svg>
        </div>
    )
}