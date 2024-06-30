import React, { useState } from 'react';
import { images } from './Image';

// 연구실 소식 이미지 슬라이더 
const [activeIdx, setActiveIdx] = useState(0);

const nextSlide = () =>{
    if(activeIdx < images.length - 1)
        setActiveIdx(activeIdx+1); 
    else setActiveIdx(0);
};

const prevSlide = () => {
    if(activeIdx > 0)
        setActiveIdx(activeIdx-1);
    else
        setActiveIdx(images.length-1);
};

useInterval(()=>{
    nextSlide();
},8000)