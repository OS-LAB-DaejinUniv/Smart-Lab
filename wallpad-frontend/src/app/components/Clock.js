/**
 * @brief Clock component.
 * @date March 9 2026
 */

import React, { useState, useEffect, memo } from 'react';

const Clock = () => {
  const [clock, setClock] = useState('00:00:00');
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    const weekDay = ['일', '월', '화', '수', '목', '금', '토'];

    const updateClock = () => {
      const date = new Date();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      setClock(`${hours}:${minutes}:${seconds}`);
      setFormattedDate(`${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. (${weekDay[date.getDay()]})`);
    };

    updateClock();
    const intervalId = setInterval(updateClock, 200);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className='flex flex-col items-end'>
      <p className={'text-xl font-semibold tabular-nums'}>
        {clock}
      </p>
      <p className={'text-sm font-semibold text-[#5E636B]'}>
        {formattedDate}
      </p>
    </div>
  );
};

export default memo(Clock);
