import { useEffect, useMemo, useState, type RefObject } from 'react';


export interface UseScrollSpyOptions {
    containerRef: RefObject<HTMLElement | null>;
    sectionIds: string[];
    getSection: (sectionId: string) => HTMLElement | undefined;
    isPaused?: boolean;
    rootMargin?: string;
    threshold?: number | number[];
}

export function useScrollSpy(options: UseScrollSpyOptions) {

    const {
        containerRef,
        sectionIds,
        getSection,
        isPaused = false,
        rootMargin = '-10% 0px -70% 0px',
        threshold = [0, 0.25, 0.5, 0.75, 1]
    } = options;

    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const stableSectionIds = useMemo(() => sectionIds, [sectionIds]);

    useEffect(() => {

        const container = containerRef.current;
        if (!container || stableSectionIds.length === 0) {
            return;
        }

        const updateActiveSection = () => {
            if (isPaused) {
                return;
            }
            setActiveSectionId(resolveActiveSectionId(container, stableSectionIds, getSection));
        };

        updateActiveSection();

        const observer = new IntersectionObserver(
            () => {
                updateActiveSection();
            },
            {
                root: container,
                rootMargin,
                threshold
            }
        );

        for (const sectionId of stableSectionIds) {
            const section = getSection(sectionId);
            if (section) {
                observer.observe(section);
            }
        }

        container.addEventListener('scroll', updateActiveSection, { passive: true });

        return () => {
            observer.disconnect();
            container.removeEventListener('scroll', updateActiveSection);
        };

    }, [containerRef, getSection, isPaused, rootMargin, stableSectionIds, threshold]);

    const normalizedActiveSectionId = stableSectionIds.length === 0 ? null : activeSectionId;

    return { activeSectionId: normalizedActiveSectionId };

}

function resolveActiveSectionId(
    container: HTMLElement,
    sectionIds: string[],
    getSection: (sectionId: string) => HTMLElement | undefined
): string | null {

    if (sectionIds.length === 0) {
        return null;
    }

    const containerTop = container.getBoundingClientRect().top;
    const candidates = sectionIds
        .map((sectionId) => {
            const section = getSection(sectionId);
            if (!section) {
                return null;
            }
            return {
                sectionId,
                top: section.getBoundingClientRect().top - containerTop
            };
        })
        .filter((candidate): candidate is { sectionId: string; top: number } => candidate !== null);

    if (candidates.length === 0) {
        return null;
    }

    const atOrAboveTop = candidates.filter((candidate) => candidate.top <= 8);
    if (atOrAboveTop.length > 0) {
        return atOrAboveTop[atOrAboveTop.length - 1].sectionId;
    }

    return candidates[0].sectionId;

}
