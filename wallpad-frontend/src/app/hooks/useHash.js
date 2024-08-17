'use client'

import { useState, useEffect } from 'react';

export default function useHash() {
    let hash, setHash;
    if (typeof window !== 'undefined') {
        [hash, setHash] = useState(window.location.hash);
    }

    useEffect(() => {
        const handleOnHashChange = () => {
            if (typeof window !== 'undefined') {
                setHash(window.location.hash);
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('hashchange', handleOnHashChange);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('hashchange', handleOnHashChange);
            }
        }
    }, []);

    return hash;
}