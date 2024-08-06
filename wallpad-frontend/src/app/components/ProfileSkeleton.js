/**
 * @brief Member profile skeleton.
 * @author Jay Kang
 * @date July 24, 2024
 * @version 0.1
 */

import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const ProfileSkeleton = () => {

  return (
    <>
      <div
        className="flex flex-col justify-between bg-[#f2f4f6] w-[9rem] h-[7.3rem] rounded-2xl px-[1.1rem] pt-[.8rem] pb-[.95rem]">
        <div>
          <div className='flex flex-col'>
            <Skeleton className='mb-1.5' />
            <Skeleton style={{ width: '64px' }}/>
          </div>
        </div>
        <div className='flex w-full justify-end'>
          <Skeleton
            circle={true}
            className='profile-skeleton float-rights'
          />
        </div>
      </div>
    </>
  )
}

export default ProfileSkeleton