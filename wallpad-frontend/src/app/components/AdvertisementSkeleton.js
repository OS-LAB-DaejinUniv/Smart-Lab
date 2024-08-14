import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const AdvertisementSkeleton = () => {
    return (
        <div className='flex flex-col justify-between p-5 bg-[#F5F5F5] rounded-2xl w-full h-[9.5rem]'>
            <div>
                <Skeleton
                    style={{ width: '23rem' }}
                    className='mb-2'
                />
                <Skeleton
                    style={{ width: '18rem' }}
                />
            </div>
            <div>
                <Skeleton
                    style={{ width: '15rem' }}
                    className='mb-1.5'
                />
            </div>
        </div>
    );
}

module.exports = AdvertisementSkeleton;