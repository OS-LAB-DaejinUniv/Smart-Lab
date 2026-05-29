import { Monitor, Users, Code, Newspaper, History, Settings } from 'lucide-react';

export const sectionMenu = [
    { slug: 'system',    href: '/settings/system',    name: '시스템 상태',    desc: '시스템 상태를 한눈에 볼 수 있어요.',                      icon: Monitor   },
    { slug: 'member',    href: '/settings/member',    name: '구성원 관리',    desc: '구성원을 추가하거나 정보를 변경할 수 있어요.',          icon: Users     },
    { slug: 'extension', href: '/settings/extension', name: '확장 프로그램',   desc: '이벤트 발생시 코드를 실행할 수 있어요.',    icon: Code      },
    { slug: 'ad',        href: '/settings/ad',        name: '광고 관리',      desc: '재부재 화면에 표시되는 광고를 변경할 수 있어요.',       icon: Newspaper },
    { slug: 'log',       href: '/settings/log',       name: '로그 조회',      desc: '출퇴근 내역을 조회할 수 있어요.',                          icon: History   },
    { slug: 'config',    href: '/settings/config',    name: '환경설정',       desc: '장치 설정을 변경할 수 있어요.',                                   icon: Settings  },
];
