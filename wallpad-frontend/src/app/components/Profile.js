/*
랩원 프로필 컴포넌트(출퇴근 여부,재중 여부...)
파라미터 설명
name:       이름 문자열
position:   직책(랩장, 부원)
status:     상태 문자열(재실, 수업 중, 퇴근 등)
emoji:      프로필 이모지
isDisabled: true인 경우 이모지 및 텍스트를 흐리게 표시
*/
import localFont from "next/font/local";

const statusEmoji = localFont({
  src: '../../../public/fluentuiEmoji.ttf',
  variable: '--status-emoji'
});

const Profile = ({ name, position, status, emoji, isDisabled = false }) => {
  const disabledColor = '#919398';
  const enabledColor = '#2A2C33';
  const textColor = isDisabled ? `text-[${disabledColor}]` : `text-[${enabledColor}]`;

  return (
    <>
      <div
        className={`bg-[#f2f4f6] w-[9rem] h-[7.3rem] rounded-2xl px-[1.1rem] pb-[1rem] pt-[0.8rem] ${textColor}`}>
        <div className='flex flex-col'>
          <div className='flex items-end'>
            <p className='text-xl font-bold leading-[1.3]'>{ name }</p>
            <p className='text-sm ml-1'>{ position }</p>
          </div>
          <p
            className='text-sm leading-[1.4]'
          >{ status }</p>
        </div>
        <p
          className={`right-0 text-4xl text-right leading-[1.3]`}
          style={{ filter: `${isDisabled ? 'grayscale(100%)' : ''}` }}
        >{ emoji }</p>
      </div>
    </>
  )
}

export default Profile