import { useCallback, useState, type RefObject } from 'react';
import { useScrollSpy } from './useScrollSpy';
import { useScrollToSection, type ScrollToSectionOptions } from './useScrollToSection';
import { useSectionRegistry } from './useSectionRegistry';


export interface UseSectionNavigationSyncOptions {
    containerRef: RefObject<HTMLElement | null>;
    sectionIds: string[];
    rootMargin?: string;
    threshold?: number | number[];
}

export function useSectionNavigationSync(options: UseSectionNavigationSyncOptions) {

    const { containerRef, sectionIds, rootMargin, threshold } = options;

    const { registerSection, unregisterSection, getSection } = useSectionRegistry<HTMLElement>();
    const { scrollToSection } = useScrollToSection({ containerRef, getSection });
    const [forcedActiveSectionId, setForcedActiveSectionId] = useState<string | null>(null);
    const { activeSectionId } = useScrollSpy({ containerRef, sectionIds, getSection, rootMargin, threshold });

    const scrollToNavigationSection = useCallback((sectionId: string, scrollOptions?: ScrollToSectionOptions) => {
        const didScroll = scrollToSection(sectionId, scrollOptions);
        if (!didScroll) {
            return false;
        }
        setForcedActiveSectionId(sectionId);
        return true;
    }, [scrollToSection]);

    const releaseForcedActiveSection = useCallback(() => {
        setForcedActiveSectionId(null);
    }, []);

    return {
        activeSectionId: forcedActiveSectionId ?? activeSectionId,
        registerSection,
        unregisterSection,
        scrollToSection: scrollToNavigationSection,
        releaseForcedActiveSection
    };

}
