import { useCallback, type RefObject } from 'react';


export interface ScrollToSectionOptions {
    behavior?: ScrollBehavior;
    offsetTop?: number;
}

export interface UseScrollToSectionOptions {
    containerRef: RefObject<HTMLElement | null>;
    getSection: (sectionId: string) => HTMLElement | undefined;
}

export function useScrollToSection(options: UseScrollToSectionOptions) {

    const { containerRef, getSection } = options;

    const scrollToSection = useCallback((sectionId: string, scrollOptions: ScrollToSectionOptions = {}) => {

        const container = containerRef.current;
        const section = getSection(sectionId);

        if (!container || !section) {
            return false;
        }

        const { behavior = 'smooth', offsetTop = 0 } = scrollOptions;
        const containerTop = container.getBoundingClientRect().top;
        const targetTop = section.getBoundingClientRect().top - containerTop + container.scrollTop - offsetTop;

        container.scrollTo({
            top: targetTop,
            behavior
        });

        return true;
    }, [containerRef, getSection]);

    return { scrollToSection };

}
