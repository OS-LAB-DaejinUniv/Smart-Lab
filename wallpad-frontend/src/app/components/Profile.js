/**
 * @brief Member profile component.
 * @author Jay Kang, tlsdnwls
 * @date July 19, 2024
 * @version 0.1
 */

const Profile = ({ name, position, status, emoji, isDisabled = false }) => { // emoji used as fallback of profile image.
  const disabledColor = '#919398';
  const enabledColor = '#2A2C33';
  // `isDisabled` decides whether profile image (or emoji) are shown grayscale or not.
  const textColor = isDisabled ? `text-[${disabledColor}]` : `text-[${enabledColor}]`;
  const positionText = ['부원', '랩장'];
  const statusText = ['퇴근', '재실', '군대'];

  return (
    <>
      <div
        className={`bg-[#f2f4f6] w-[9rem] h-[7.3rem] rounded-2xl px-[1.1rem] pb-[1rem] pt-[0.8rem] ${textColor}`}>
        <div className='flex flex-col'>
          <div className='flex items-end'>
            <p className='text-xl font-bold leading-[1.3]'>{name}</p>
            <p className='text-sm ml-1'>{positionText[parseInt(position)]}</p>
          </div>
          <p
            className='text-sm leading-[1.4]'
          >{statusText[parseInt(status)]}</p>
        </div>
        {
          (() => {
            return (
              <p
                className={`right-0 text-4xl text-right leading-[1.3]`}
                style={{ filter: `${(isDisabled === 0) ? 'grayscale(100%)' : ''}` }}
              >{emoji}</p>
            )
          })()
        }

      </div>
    </>
  )
}

export default Profile