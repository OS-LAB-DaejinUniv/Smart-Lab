/**
 * @brief Advertisement section component.
 * @author Jay Kang
 * @date Aug 14, 2024
 * @version 0.1
 */

import React, { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import AdvertisementSkeleton from './AdvertisementSkeleton';
const backendURL = require('../../../package').config.socketio;
import 'react-loading-skeleton/dist/skeleton.css';

const Advertisement = () => {
    const transitionRate = 8000;
    let [adList, setAdList] = useState(null);
    let [currentIndex, setCurrentIndex] = useState(null);
    let [isError, setIsError] = useState(false);

    // fetch ad list from server.
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(new URL('/wallpad/ad/list', backendURL));
                const json = await res.json();

                console.log('fetched ad image list', json.list);
                setAdList(json.list);
                if (json.list.length > 0) {
                    setCurrentIndex(0);
                }

            } catch (err) {
                console.error('[Advertisement.js] failed to fetch ad list. marked `isError` as true.');

                setIsError(true);
                return;
            }
        })();
    }, []);

    // ad loaded -> let ad image transitioned automatically.
    useEffect(() => {
        if (!adList) return;

        const interval = setInterval(() => {
            if (currentIndex < adList.length - 1) {
                // console.log('current page:', currentIndex, 'transitioned to:', currentIndex + 1, 'total pages:', adList.length - 1);
                setCurrentIndex(currentIndex + 1);
            } else {
                // console.log('current page:', currentIndex, 'transitioned to:', 0, 'total pages:', adList.length - 1);
                setCurrentIndex(0);
            }
            // console.log('current page:', currentIndex);
        }, transitionRate);

        return () => clearInterval(interval);
    }, [adList, currentIndex]);

    // show skeleton until to be loaded.
    if ((adList == null) && (isError == false)) {
        console.log('[Advertisement.js] ad section is being loaded now.');

        return <AdvertisementSkeleton />
    }

    // error occured during fetch or something.
    else if (isError) {
        console.error('[Advertisement.js] 1. failed to load ads.');

        return (
            <div className='leading-normal bg-[#F5F5F5] font-semibold rounded-2xl overflow-hidden w-full h-[9.5rem]'>
                <p className='mx-[.9rem] my-[.9rem]'>
                    🤯 Failed to fetch image. review current configuration.
                </p>
            </div>
        )
    }

    // warns if there are no images to show on backend.
    else if ((adList.length == 0) && (isError == false)) {
        console.log('[Advertisement.js] 2. there are no ads to show.');

        return (
            <div className='leading-normal bg-[#F5F5F5] font-semibold rounded-2xl overflow-hidden w-full h-[9.5rem]'>
                <p className='mx-[.9rem] my-[.9rem]'>
                    🤔 There are no images on directory.
                </p>
            </div>
        )
    }

    // show ad images if adList exists && length overs 1.
    else {
        console.log('[Advertisement.js] 3. successfully loaded page', currentIndex);

        return (
            <div className='relative bg-[#F5F5F5] rounded-2xl overflow-hidden w-full h-[9.5rem]'>
                {/* page indicator */}
                <p className={`absolute font-semibold text-sm tabular-nums tracking-wider bg-[#f2f4f6] opacity-90 rounded-full px-1.5 right-[.7rem] top-[.6rem] ${isError ? 'hidden' : ''}`}>
                    {currentIndex + 1}
                    <span
                        style={{
                            color: '#4E5968'
                        }}
                    >
                        {`/${adList.length}`}
                    </span>
                </p>
                {
                    // ad image
                    (() => {
                        const imageURL = new URL(
                            `/wallpad/ad/${adList[currentIndex]}`, backendURL
                        ).href;

                        return (
                            <Image
                                src={imageURL}
                                width='1500'
                                height='0'
                                alt='ad_image'
                                onError={err => {
                                    setIsError(true);
                                    console.error('[Advertisement.js] next/image onError called:', adList, currentIndex, imageURL, err);
                                }}
                                style={{
                                    height: '100%',
                                    objectFit: 'fill'
                                }}
                            />
                        )
                    })()
                }
            </div>
        )
    }
}

export default memo(Advertisement);