/*
알림 컴포넌트
파라미터 설명
type:        알림의 종류
name:        이름(본문에서 필요한 경우에만 전달)
*/
const NotifyWindow = ({ type, name }) => {
  const title = {
    'unsupported': '지원하지 않는 카드에요',
    'invalidCrypto': '유효하지 않은 카드에요',
    'RFDrop': '카드를 다시 대주세요',
    'notFound': '등록된 카드가 아니에요',
    'arrival': '재실 상태로 변경했어요!',
    'goHome': '퇴근 상태로 변경했어요!'
  };

  const message = {
    'unsupported': 'OS랩 카드가 아닌 것 같네요. 카드를 확인하고 다시 시도해 주세요.',
    'invalidCrypto': '애플릿이 비정상적으로 설치되어 있어 처리할 수 없어요. 담당 부원에게 문의해 주세요.',
    'RFDrop': '카드를 좀 더 오래 태그해 주세요. 정상적으로 처리되면 알림음이 들려요.',
    'notFound': '등록된 카드가 아니어서 처리하지 못했어요. 담당 부원에게 문의해 주세요.',
    'arrival': '님의 현재 상태를 재실 상태로 변경했어요.',
    'goHome': '님의 현재 상태를 퇴근 상태로 변경했어요.'
  };
  
  return (
    <>
      <div
        className='w-full h-full fixed z-20 bg-slate-950 opacity-30 notify-background'>
      </div>
      <div
        className="bg-white w-[94%] fixed h-auto z-30 rounded-2xl flex flex-col p-5 tracking-tight notify-content">
        <p
          className="text-xl font-bold"
        >{ title[type] }</p>
        <p
          className="text-base pt-2"
        >{ (name || '') + message[type] }</p>
      </div>
    </>
  )
}

export default NotifyWindow