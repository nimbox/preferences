export interface OverridableIconProps {
    overridable: boolean;
}

export function OverridableIcon({ overridable }: OverridableIconProps) {
    if (overridable) {
        return null;
    }
    return (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="not overridable" style={{ flexShrink: 0 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}
