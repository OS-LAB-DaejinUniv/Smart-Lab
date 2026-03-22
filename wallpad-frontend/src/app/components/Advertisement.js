/**
 * @brief Advertisement section component.
 * @author Jay Kang
 * @date March 8, 2026
 * @version 0.4
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import AdvertisementSkeleton from './AdvertisementSkeleton';
import { io } from 'socket.io-client';
const backendURL = require('../../../package').config.socketio;
import 'react-loading-skeleton/dist/skeleton.css';

const TRANSITION_DURATION = 400; // 0.4초

const Advertisement = () => {
    const [transitionRate, setTransitionRate] = useState(8000);
    let [adList, setAdList] = useState(null);
    let [currentIndex, setCurrentIndex] = useState(null);
    let [previousIndex, setPreviousIndex] = useState(null);
    let [isTransitioning, setIsTransitioning] = useState(false);
    let [fadeIn, setFadeIn] = useState(true); // 새 이미지 fade-in 트리거 (초기값 true: 첫 로드시 바로 보이도록)
    let [isError, setIsError] = useState(false);
    const intervalRef = useRef(null);
    const transitionTimeoutRef = useRef(null);
    const fadeInTimeoutRef = useRef(null);
    const objectUrlsRef = useRef([]);

    // fetch ad list and initial transition rate from server.
    useEffect(() => {
        (async () => {
            try {
                // fetch ad list
                const res = await fetch(new URL('/wallpad/ad/list', backendURL));
                const json = await res.json();

                console.log('fetched ad image list', json.list);
                if (objectUrlsRef.current.length > 0) {
                    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
                    objectUrlsRef.current = [];
                }

                if (json.list.length > 0) {
                    const preloadResults = await Promise.allSettled(
                        json.list.map(async (adId) => {
                            const adRes = await fetch(new URL(`/wallpad/ad/${adId}`, backendURL));
                            if (!adRes.ok) {
                                throw new Error(`failed to preload ad image: ${adId}`);
                            }

                            const adBlob = await adRes.blob();
                            const objectURL = URL.createObjectURL(adBlob);
                            objectUrlsRef.current.push(objectURL);

                            return {
                                id: adId,
                                src: objectURL
                            };
                        })
                    );

                    const loadedAds = preloadResults
                        .filter(result => result.status === 'fulfilled')
                        .map(result => result.value);

                    const failedCount = preloadResults.length - loadedAds.length;
                    if (failedCount > 0) {
                        console.error(`[Advertisement.js] ${failedCount} ad image(s) failed during preload.`);
                    }

                    setAdList(loadedAds);
                    if (loadedAds.length > 0) {
                        setCurrentIndex(0);
                    } else {
                        setIsError(true);
                    }
                } else {
                    setAdList([]);
                }

                // fetch initial transition rate
                const configRes = await fetch(new URL('/wallpad/config/public', backendURL));
                const configJson = await configRes.json();
                if (configJson.status && configJson.adTransitionRate) {
                    setTransitionRate(configJson.adTransitionRate);
                }

            } catch (err) {
                console.error('[Advertisement.js] failed to fetch ad list. marked `isError` as true.');
                setIsError(true);
                return;
            }
        })();
    }, []);

    useEffect(() => {
        return () => {
            if (objectUrlsRef.current.length > 0) {
                objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
                objectUrlsRef.current = [];
            }
        };
    }, []);

    // socket.io listener for dynamic transition rate changes
    useEffect(() => {
        const socket = io(backendURL);

        socket.on('connect', () => {
            console.log('[Advertisement.js] Socket.io connected');
            socket.emit('getAdTransitionRate');
        });

        socket.on('adTransitionRateResp', (data) => {
            if (data.rate && data.rate >= 1000 && data.rate <= 60000) {
                console.log('[Advertisement.js] Transition rate updated:', data.rate);
                setTransitionRate(data.rate);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // ad loaded -> let ad image transitioned automatically.
    useEffect(() => {
        if (!adList || adList.length === 0) return;

        // clear previous interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        intervalRef.current = setInterval(() => {
            // 이전 인덱스 저장 및 트랜지션 시작
            setFadeIn(false); // fade-in 초기화 (새 이미지 opacity: 0)
            setCurrentIndex(prev => {
                setPreviousIndex(prev);
                setIsTransitioning(true);
                
                if (prev === null) return 0;
                if (prev < adList.length - 1) {
                    return prev + 1;
                } else {
                    return 0;
                }
            });
        }, transitionRate);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [adList, transitionRate]);

    // 트랜지션 종료 후 이전 이미지 숨기기
    useEffect(() => {
        if (isTransitioning) {
            // 이전 타임아웃 클리어
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
            }
            
            transitionTimeoutRef.current = setTimeout(() => {
                setIsTransitioning(false);
                setPreviousIndex(null);
            }, TRANSITION_DURATION);
        }

        return () => {
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
            }
        };
    }, [isTransitioning, currentIndex]);

    // fade-in 트리거 (다음 프레임에서 실행해 CSS 트랜지션 작동)
    useEffect(() => {
        if (currentIndex !== null && !fadeIn) {
            // 이전 타임아웃 클리어
            if (fadeInTimeoutRef.current) {
                clearTimeout(fadeInTimeoutRef.current);
            }
            
            // 다음 프레임에서 fadeIn 트리거
            fadeInTimeoutRef.current = setTimeout(() => {
                setFadeIn(true);
            }, 20); // 충분한 시간을 두어 브라우저가 opacity: 0 상태를 인식하도록 함
        }

        return () => {
            if (fadeInTimeoutRef.current) {
                clearTimeout(fadeInTimeoutRef.current);
            }
        };
    }, [currentIndex]);

    // show skeleton until all images are loaded
    if ((adList == null) && (isError == false)) {
        console.log('[Advertisement.js] ad section is being loaded now.');
        return <AdvertisementSkeleton />
    }

    // error occurred during fetch or something.
    else if (isError) {
        console.error('[Advertisement.js] 1. failed to load ads.');
        return (
            <div className='flex justify-center items-center bg-[#f2f4f6] font-medium rounded-2xl overflow-hidden w-full h-[9.5rem]'>
                <p>광고 이미지를 불러오지 못했어요</p>
            </div>
        )
    }

    // warns if there are no images to show on backend.
    else if ((adList.length == 0) && (isError == false)) {
        console.log('[Advertisement.js] 2. there are no ads to show.');
        return (
            <div className='flex justify-center items-center bg-[#f2f4f6] font-medium rounded-2xl overflow-hidden w-full h-[9.5rem]'>
                <p>현재 진행중인 광고가 없어요</p>
            </div>
        )
    }

    // show ad images with visibility toggle (all preloaded)
    else {
        return (
            <div className='relative bg-[#F5F5F5] rounded-2xl overflow-hidden w-full h-[9.5rem]'>
                {/* page indicator */}
                <p className={`absolute z-10 font-semibold text-sm tabular-nums tracking-wider bg-[#f2f4f6] opacity-90 rounded-full px-1.5 right-[.7rem] top-[.6rem] ${isError ? 'hidden' : ''}`}>
                    {currentIndex + 1}
                    <span style={{ color: '#4E5968' }}>
                        {`/${adList.length}`}
                    </span>
                </p>
                {/* preloaded images - only one visible at a time */}
                {adList.map((ad, idx) => {
                    const isCurrent = currentIndex === idx;
                    const isPrevious = previousIndex === idx && isTransitioning;
                    const shouldShow = isCurrent || isPrevious;
                    
                    // 현재 이미지: fadeIn이 true일 때만 opacity 1 (fade-in 효과)
                    // 이전 이미지: 트랜지션 중에는 opacity 1 유지 (배경)
                    let imageOpacity = 0;
                    if (isCurrent) {
                        imageOpacity = fadeIn ? 1 : 0;
                    } else if (isPrevious) {
                        imageOpacity = 1;
                    }

                    if (adList.length == 1)
                        imageOpacity = 1;
                    
                    return (
                        <img
                            key={ad.id}
                            src={ad.src}
                            alt={`ad_image_${idx}`}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'fill',
                                visibility: shouldShow ? 'visible' : 'hidden',
                                opacity: imageOpacity,
                                // 이전 이미지는 z-index: 1 (배경), 현재 이미지는 z-index: 2 (전면)
                                zIndex: isCurrent ? 2 : (isPrevious ? 1 : 0),
                                transition: `opacity ${TRANSITION_DURATION / 1000}s ease-in-out`
                            }}
                        />
                    );
                })}
            </div>
        )
    }
}

export default memo(Advertisement);