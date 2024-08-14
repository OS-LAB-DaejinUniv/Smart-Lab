/**
 * @brief Advertisement section component.
 * @author Jay Kang
 * @date Aug 14, 2024
 * @version 0.1
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import AdvertisementSkeleton from './AdvertisementSkeleton';
const backendURL = require('../../../package').config.socketio;
import 'react-loading-skeleton/dist/skeleton.css';

const NotifyWindow = () => {
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

    useEffect(() => {
        if (!adList) return;

        const interval = setInterval(() => {
            if (currentIndex < adList.length - 1) {
                console.log('현재페이지', currentIndex, '전체페이지', adList.length - 1, '전환될페이지', currentIndex + 1);
                setCurrentIndex(currentIndex + 1);
            } else {
                console.log('현재페이지', currentIndex, '전체페이지', adList.length - 1, '전환될페이지', 0);
                setCurrentIndex(0);
            }
            console.log('현재 페이지', currentIndex);
        }, transitionRate);

        return () => clearInterval(interval);
    }, [adList]);

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

    // show ad images if adList exists.
    else {
        console.log('[Advertisement.js] 3. successfully loaded.');

        return (
            <div className='relative bg-[#F5F5F5] rounded-2xl overflow-hidden w-full h-[9.5rem]'>
                <p className={`absolute font-semibold text-sm tabular-nums bg-white opacity-85 rounded-full px-1.5 right-[.7rem] top-[.6rem] ${isError ? 'hidden' : ''}`}>
                    {`${currentIndex + 1}/${adList.length}`}
                </p>
                {
                    (() => {
                        console.log('현재 페이지', currentIndex);
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
                                    console.error('next/image onError:', adList, currentIndex, imageURL, err);
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

export default NotifyWindow;