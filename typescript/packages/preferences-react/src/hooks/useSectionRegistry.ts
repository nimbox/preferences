import { useCallback, useRef } from 'react';


export interface SectionRegistry<T extends HTMLElement = HTMLElement> {
    registerSection: (sectionId: string, element: T | null) => void;
    unregisterSection: (sectionId: string) => void;
    getSection: (sectionId: string) => T | undefined;
    entries: () => Array<[string, T]>;
}


export function useSectionRegistry<T extends HTMLElement = HTMLElement>(): SectionRegistry<T> {

    const sectionsRef = useRef(new Map<string, T>());

    const registerSection = useCallback((sectionId: string, element: T | null) => {
        if (!element) {
            sectionsRef.current.delete(sectionId);
            return;
        }
        sectionsRef.current.set(sectionId, element);
    }, []);

    const unregisterSection = useCallback((sectionId: string) => {
        sectionsRef.current.delete(sectionId);
    }, []);

    const getSection = useCallback((sectionId: string) => {
        return sectionsRef.current.get(sectionId);
    }, []);

    const entries = useCallback(() => {
        return Array.from(sectionsRef.current.entries());
    }, []);

    return {
        registerSection,
        unregisterSection,
        getSection,
        entries
    };

}
