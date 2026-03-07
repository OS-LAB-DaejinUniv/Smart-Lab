'use client'

import { useState, useEffect, useCallback } from 'react';

/**
 * @brief Custom hook for hash-based routing with SSR support.
 * @description Handles URL hash changes reliably, avoiding hydration mismatches.
 * @returns {string} Current hash value (e.g., '#system', '')
 */
export default function useHash() {
    // 초기값을 빈 문자열로 설정하여 hydration mismatch 방지
    const [hash, setHash] = useState('');
    const [isInitialized, setIsInitialized] = useState(false);

    // 클라이언트 사이드에서만 hash 초기화
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setHash(window.location.hash);
            setIsInitialized(true);
        }
    }, []);

    // hashchange 이벤트 리스너
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleHashChange = () => {
            setHash(window.location.hash);
        };

        window.addEventListener('hashchange', handleHashChange);
        
        // popstate도 감지하여 history 네비게이션 지원
        window.addEventListener('popstate', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('popstate', handleHashChange);
        };
    }, []);

    return hash;
}

/**
 * @brief Navigate to a specific hash.
 * @param {string} newHash - Target hash (e.g., '#system')
 */
export function navigateToHash(newHash) {
    if (typeof window !== 'undefined') {
        window.location.hash = newHash;
    }
}