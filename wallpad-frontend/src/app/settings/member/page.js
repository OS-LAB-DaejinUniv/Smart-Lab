'use client'

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import io from 'socket.io-client';
import packageJSON from '../../../../package';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ChevronDown, ChevronUp, UserPlus, CreditCard, Nfc } from 'lucide-react';

import { backendPort } from '../_lib/backend';
import { authFetch, getAccessToken, refreshAccessToken } from '../_lib/auth';
import { formatBackendError, formatThrownError } from '../_lib/error';

export default function MemberSection() {
    let [memberList, setMemberList] = useState([]);
    let positionText = ['부원', '랩장', '수습부원'];
    let [statusCaption, setStatusCaption] = useState([]);

    let [githubFailedMembers, setGithubFailedMembers] = useState(new Set());

    let [isOpenNameDialog, setIsOpenNameDialog] = useState(false);
    let [isOpenCardDialog, setIsOpenCardDialog] = useState(false);
    let [isOpenNicknameDialog, setIsOpenNicknameDialog] = useState(false);
    let [isOpenPositionDialog, setIsOpenPositionDialog] = useState(false);

    let [currentMember, setCurrentMember] = useState(null);

    let [newName, setNewName] = useState('');
    let [newCard, setNewCard] = useState('');
    let [newNickname, setNewNickname] = useState('');
    let [newPosition, setNewPosition] = useState('');

    let [cardError, setCardError] = useState('');
    let [addMemberError, setAddMemberError] = useState('');
    let [nameError, setNameError] = useState('');
    let [nicknameError, setNicknameError] = useState('');
    let [positionError, setPositionError] = useState('');
    let [deleteError, setDeleteError] = useState('');

    let [addMemberName, setAddMemberName] = useState('');
    let [addMemberCard, setAddMemberCard] = useState('');
    let [addMemberNickname, setAddMemberNickname] = useState('');
    let [addMemberPosition, setAddMemberPosition] = useState('');
    let [addMemberSkipCard, setAddMemberSkipCard] = useState(false);

    let [isOpenAddMemberDialog, setIsOpenAddMemberDialog] = useState(false);
    let [isOpenDeleteDialog, setIsOpenDeleteDialog] = useState(false);

    let [emojiList, setEmojiList] = useState([]);
    let [selectedEmoji, setSelectedEmoji] = useState(null);

    let [cardReadStatus, setCardReadStatus] = useState('idle');
    let [cardReadError, setCardReadError] = useState('');
    let [cardReadTarget, setCardReadTarget] = useState(null);
    let [cardReadValue, setCardReadValue] = useState('');
    let cardReadEventSourceRef = useRef(null);

    function fetchEmojiList() {
        const emojiURL = new URL(`/wallpad/emoji`, `http://${location.hostname}:${backendPort}`);
        fetch(emojiURL)
            .then(res => res.json())
            .then(body => {
                if (!body.list) throw new Error();
                setEmojiList(body.list);
            })
            .catch(err => console.error('failed to fetch emoji list', err));
    }

    function resetCardReadState() {
        if (cardReadEventSourceRef.current) {
            cardReadEventSourceRef.current.close();
            cardReadEventSourceRef.current = null;
        }
        setCardReadStatus('idle');
        setCardReadError('');
        setCardReadTarget(null);
        setCardReadValue('');
    }

    async function startCardRead(target) {
        if (!target) return;

        if (cardReadEventSourceRef.current) {
            cardReadEventSourceRef.current.close();
            cardReadEventSourceRef.current = null;
        }

        setCardReadTarget(target);
        setCardReadStatus('waiting');
        setCardReadError('');
        setCardReadValue('');

        // EventSource cannot send headers; pass access token via query.
        let token = getAccessToken();
        if (!token) token = await refreshAccessToken();
        const cardTestURL = new URL(`/wallpad/card/test?token=${token || ''}`, `http://${location.hostname}:${backendPort}`);

        const eventSource = new EventSource(cardTestURL);
        cardReadEventSourceRef.current = eventSource;

        eventSource.addEventListener('connected', () => {
            console.log('[Card Read] Connected, waiting for card...');
        });

        eventSource.addEventListener('cardRead', (e) => {
            const data = JSON.parse(e.data);
            if (data.status && data.uuid) {
                setCardReadStatus('success');
                setCardReadValue(data.uuid);
                if (target === 'add') {
                    setAddMemberCard(data.uuid);
                    setAddMemberError('');
                } else if (target === 'update') {
                    setNewCard(data.uuid);
                    setCardError('');
                }
            }
            eventSource.close();
            cardReadEventSourceRef.current = null;
        });

        eventSource.addEventListener('error', (e) => {
            try {
                const data = JSON.parse(e.data);
                setCardReadError(data.reason || '카드 읽기에 실패했어요.');
            } catch {
                setCardReadError('카드 읽기에 실패했어요.');
            }
            setCardReadStatus('error');
            eventSource.close();
            cardReadEventSourceRef.current = null;
        });

        eventSource.onerror = () => {
            if (cardReadEventSourceRef.current) {
                setCardReadStatus('error');
                setCardReadError('서버와의 연결이 끊어졌어요.');
                eventSource.close();
                cardReadEventSourceRef.current = null;
            }
        };
    }

    function fetchMembetList() {
        const memberListURL = new URL('/wallpad/management/member/list', `http://${location.hostname}:${backendPort}`);
        authFetch(memberListURL)
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setMemberList(Array.isArray(body.rows) ? body.rows : []);
                    return;
                }
                throw new Error();
            })
            .catch(err => console.error('failed to fetch member list', err));
    }

    function fetchStatusCaption() {
        const statusCaptionURL = new URL('/wallpad/management/member/statuscaption', `http://${location.hostname}:${backendPort}`);
        authFetch(statusCaptionURL)
            .then(res => res.json())
            .then(body => {
                if (body.status && Array.isArray(body.caption)) setStatusCaption(body.caption);
            })
            .catch(err => console.error('failed to fetch status caption', err));
    }

    useEffect(() => {
        fetchMembetList();
        fetchStatusCaption();
        fetchEmojiList();

        // Reuse the same socket.io endpoint as the wallpad frontend to get
        // real-time member status updates (card tags, other admins' edits).
        const socket = io(packageJSON.config.socketio);
        const refresh = () => fetchMembetList();
        socket.on('success', refresh);             // card scan / status change
        socket.on('reqFrontendRefresh', refresh);  // any member/config mutation

        return () => {
            if (cardReadEventSourceRef.current) {
                cardReadEventSourceRef.current.close();
                cardReadEventSourceRef.current = null;
            }
            socket.off('success', refresh);
            socket.off('reqFrontendRefresh', refresh);
            socket.disconnect();
        };
    }, []);

    // 32-char uppercase hex placeholder for probationary members without a card yet.
    // Admin re-registers via the 카드 button once a real card is issued.
    const generatePlaceholderCardUUID = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID().replace(/-/g, '').toUpperCase();
        }
        let out = '';
        for (let i = 0; i < 32; i++) out += Math.floor(Math.random() * 16).toString(16);
        return out.toUpperCase();
    };

    const addNewMember = () => {
        const skipCard = addMemberSkipCard && addMemberPosition === '2';

        if (!addMemberName || !addMemberPosition || (!skipCard && !addMemberCard)) {
            setAddMemberError('모든 필수 항목을 입력해 주세요..');
            return;
        }
        if (!skipCard && !validateCardNumber(addMemberCard)) {
            setAddMemberError('카드 번호는 32자리의 16진수여야 합니다.');
            return;
        }

        const uuid = skipCard ? generatePlaceholderCardUUID() : addMemberCard;

        const addMemberURL = new URL('/wallpad/management/member', `http://${location.hostname}:${backendPort}`);
        authFetch(addMemberURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: addMemberName,
                uuid,
                emoji: addMemberNickname || 'persevering',
                github: addMemberNickname || null,
                position: parseInt(addMemberPosition)
            })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    fetchMembetList();
                    setIsOpenAddMemberDialog(false);
                    resetCardReadState();
                    setAddMemberName('');
                    setAddMemberCard('');
                    setAddMemberNickname('');
                    setAddMemberPosition('');
                    setAddMemberSkipCard(false);
                    setAddMemberError('');
                } else {
                    setAddMemberError(formatBackendError(body, '구성원 추가에 실패했어요.'));
                }
            })
            .catch(error => {
                console.error('Failed to add new member:', error);
                setAddMemberError(formatThrownError(error, '구성원 추가에 실패했어요.'));
            });
    };

    const validateCardNumber = (card) => /^[0-9A-Fa-f]{32}$/.test(card);

    const changeMemberStatus = (uuid, newStatus) => {
        const url = new URL(`/wallpad/management/member/${uuid}/status`, `http://${location.hostname}:${backendPort}`);
        return authFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) { fetchMembetList(); return true; }
                // Backend rejects same-status requests silently — refetch the
                // list so the dropdown snaps back to the real current value,
                // and do *not* show a toast or log an error.
                if (body.error === 'NoChange') { fetchMembetList(); return false; }
                console.error('Status change failed:', body.reason);
                return false;
            })
            .catch(err => { console.error('Failed to change status:', err); return false; });
    };

    // Returns `{ ok, error }` so callers can surface the server-side exception
    // (name + message) inside their dialog rather than failing silently.
    const updateMemberField = (uuid, field, value) => {
        const url = new URL(`/wallpad/management/member/${uuid}/update`, `http://${location.hostname}:${backendPort}`);
        return authFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field, value })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) { fetchMembetList(); return { ok: true }; }
                console.error('Update failed:', body.reason);
                return { ok: false, error: formatBackendError(body, '저장에 실패했어요.') };
            })
            .catch(err => {
                console.error(`Failed to update ${field}:`, err);
                return { ok: false, error: formatThrownError(err, '저장에 실패했어요.') };
            });
    };

    const updateName = () => {
        if (!currentMember) return;
        setNameError('');
        updateMemberField(currentMember.uuid, 'name', newName).then(({ ok, error }) => {
            if (ok) setIsOpenNameDialog(false);
            else setNameError(error);
        });
    };

    const updateCard = () => {
        if (!validateCardNumber(newCard)) {
            setCardError('카드 번호는 32자리의 16진수여야 합니다.');
            return;
        }
        if (!currentMember) return;
        setCardError('');
        updateMemberField(currentMember.uuid, 'uuid', newCard)
            .then(({ ok, error }) => {
                if (ok) {
                    setIsOpenCardDialog(false);
                    resetCardReadState();
                    setCardError('');
                } else {
                    setCardError(error);
                }
            });
    };

    const saveProfile = async () => {
        if (!currentMember) return;
        setNicknameError('');
        let firstError = '';

        const githubValue = newNickname || null;
        if (githubValue !== (currentMember.github || null)) {
            const { ok, error } = await updateMemberField(currentMember.uuid, 'github', githubValue);
            if (!ok && !firstError) firstError = error;
        }

        if (selectedEmoji) {
            const emojiName = selectedEmoji.replace('.png', '');
            const { ok, error } = await updateMemberField(currentMember.uuid, 'emoji', emojiName);
            if (!ok && !firstError) firstError = error;
        }

        if (!firstError) {
            setIsOpenNicknameDialog(false);
            setSelectedEmoji(null);
        } else {
            setNicknameError(firstError);
        }
    };

    const updatePosition = () => {
        if (!currentMember) return;
        setPositionError('');
        updateMemberField(currentMember.uuid, 'position', parseInt(newPosition))
            .then(({ ok, error }) => {
                if (ok) setIsOpenPositionDialog(false);
                else setPositionError(error);
            });
    };

    const deleteMember = () => {
        if (!currentMember) return;
        setDeleteError('');
        const url = new URL(`/wallpad/management/member/${currentMember.uuid}/delete`, `http://${location.hostname}:${backendPort}`);
        authFetch(url, { method: 'POST' })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    fetchMembetList();
                    setIsOpenDeleteDialog(false);
                    setCurrentMember(null);
                } else {
                    setDeleteError(formatBackendError(body, '삭제에 실패했어요.'));
                }
            })
            .catch(err => {
                console.error('Failed to delete member:', err);
                setDeleteError(formatThrownError(err, '삭제에 실패했어요.'));
            });
    };

    const moveMember = (idx, direction) => {
        const newList = [...memberList];
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= newList.length) return;
        [newList[idx], newList[targetIdx]] = [newList[targetIdx], newList[idx]];
        setMemberList(newList);

        const orderedUUIDs = newList.map(m => m.uuid);
        const url = new URL('/wallpad/management/member/reorder', `http://${location.hostname}:${backendPort}`);
        authFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderedUUIDs })
        }).catch(err => console.error('Failed to reorder:', err));
    };

    return (
        <>
            <div className='flex flex-col space-y-5 w-full'>
                <div className="-mx-4 sm:mx-0">
                    <Table className="w-full">
                        <colgroup>
                            <col style={{ minWidth: '4.4rem' }} />
                            <col style={{ minWidth: '3.5rem', maxWidth: '10rem' }} />
                            <col style={{ minWidth: '3.5rem', maxWidth: '10rem' }} />
                            <col style={{ width: '100%' }} />
                            <col style={{ minWidth: '8rem' }} />
                            <col style={{ minWidth: '5rem' }} />
                        </colgroup>
                        <TableHeader>
                            <TableRow className='border-0 hover:bg-transparent font-medium text-sm h-11'>
                                <TableHead className='h-8 p-0 align-middle text-center text-gray-600'>사진</TableHead>
                                <TableHead className='h-8 p-0 align-middle text-center text-gray-600'>직책</TableHead>
                                <TableHead className='h-8 p-0 align-middle text-center text-gray-600'>이름</TableHead>
                                <TableHead className='h-8 p-0 align-middle text-left text-gray-600 pl-3.5'>상태</TableHead>
                                <TableHead className='h-8 p-0 align-middle text-gray-600 text-center whitespace-nowrap'>관리 메뉴</TableHead>
                                <TableHead className='h-8 p-0 align-middle text-right text-gray-600 pr-3'>표시 순서</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {memberList.length === 0 ? (
                                <TableRow className='border-0 h-20 hover:bg-transparent'>
                                    <TableCell colSpan={6} className="h-1 p-0 align-middle">
                                        <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">
                                            등록된 구성원이 없어요. 새 구성원 추가 버튼으로 구성원을 등록해 주세요.
                                        </div>
                                    </TableCell>
                                </TableRow>

                            ) : (
                                memberList.map((member, idx) => {
                                    const bgColor = idx % 2 === 0 ? 'bg-accent' : '';
                                    return (
                                        <TableRow key={member.uuid} className='border-0 h-11 hover:bg-transparent'>
                                            <TableCell className="h-1 p-0 align-middle">
                                                <div className={`h-full rounded-l-lg flex justify-center items-center text-gray-600 ${bgColor}`}>
                                                    <Image
                                                        src={(member.github && !githubFailedMembers.has(member.uuid)) ?
                                                            `https://github.com/${member.github}.png` :
                                                            `/emoji/${member.emoji}.png`
                                                        }
                                                        className="rounded-full hover:grayscale-[50%] hover:scale-95 transition-transform duration-200"
                                                        width={32}
                                                        height={32}
                                                        style={{
                                                            scale: (member.github == null || githubFailedMembers.has(member.uuid)) ? '1.1' : '1'
                                                        }}
                                                        onClick={() => {
                                                            setCurrentMember(member);
                                                            setNewNickname(member.github || '');
                                                            setSelectedEmoji(null);
                                                            setIsOpenNicknameDialog(true);
                                                        }}
                                                        onError={() => {
                                                            if (member.github && !githubFailedMembers.has(member.uuid)) {
                                                                setGithubFailedMembers(prev => new Set([...prev, member.uuid]));
                                                            }
                                                        }}
                                                        key={idx}
                                                        alt="Profile Picture"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="h-1 p-0 align-middle text-left">
                                                <div className={`h-full text-sm ${bgColor} flex items-center justify-start font-medium text-gray-600`}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button className="h-6 w-[3.5rem] px-2.5 rounded-md text-sm bg-transparent hover:bg-gray-200 text-gray-600">
                                                                {positionText[member.position]}
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className="w-32">
                                                            <DropdownMenuRadioGroup value={member.position.toString()} onValueChange={(val) => {
                                                                updateMemberField(member.uuid, 'position', parseInt(val));
                                                            }}>
                                                                {positionText.map((text, idx2) => (
                                                                    <DropdownMenuRadioItem key={idx2} value={idx2.toString()}>{text}</DropdownMenuRadioItem>
                                                                ))}
                                                            </DropdownMenuRadioGroup>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                            <TableCell className="h-1 p-0 align-middle text-left">
                                                <div className={`h-full text-sm px-2.5 ${bgColor} flex items-center justify-start font-medium text-gray-600`}>
                                                    <Button className="h-6 w-[3.5rem] rounded-md text-sm bg-transparent hover:bg-gray-200 text-gray-600"
                                                        onClick={() => {
                                                            setCurrentMember(member);
                                                            setNewName(member.name);
                                                            setIsOpenNameDialog(true);
                                                        }}>
                                                        {member.name}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="h-1 p-0 align-middle text-left">
                                                <div className={`h-full text-sm ${bgColor} flex items-center justify-start font-medium text-gray-600`}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button className="h-6 w-14 rounded-md text-sm bg-transparent hover:bg-gray-200 text-gray-600">
                                                                {statusCaption[member.status]}
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className="w-32">
                                                            <DropdownMenuRadioGroup value={member.status.toString()} onValueChange={(val) => {
                                                                changeMemberStatus(member.uuid, parseInt(val));
                                                            }}>
                                                                {statusCaption.map((text, idx2) => (
                                                                    <DropdownMenuRadioItem key={idx2} value={idx2.toString()}>{text}</DropdownMenuRadioItem>
                                                                ))}
                                                            </DropdownMenuRadioGroup>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                            <TableCell className="h-1 p-0 align-middle">
                                                <div className={`h-full text-sm flex items-center justify-center font-medium ${bgColor} text-gray-600`}>
                                                    <Button className="h-6 w-12 rounded-md text-sm bg-transparent hover:bg-gray-200 text-gray-600"
                                                        onClick={() => {
                                                            setCurrentMember(member);
                                                            setNewCard('');
                                                            setCardError('');
                                                            resetCardReadState();
                                                            setIsOpenCardDialog(true);
                                                        }}>
                                                        <CreditCard className="w-3 h-3 mr-0.5" />
                                                        ID카드
                                                    </Button>
                                                    <Button className="h-6 w-12 rounded-md text-sm bg-transparent hover:bg-red-500 text-red-500 hover:text-white"
                                                        onClick={() => {
                                                            setCurrentMember(member);
                                                            setIsOpenDeleteDialog(true);
                                                        }}>
                                                        삭제
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="h-1 p-0 align-middle">
                                                <div className={`h-full text-sm rounded-r-lg flex items-center justify-center font-medium ${bgColor}`}>
                                                    <ChevronDown strokeWidth={1.6} className='stroke-slate-400 mr-1.5 cursor-pointer hover:stroke-slate-700' onClick={() => moveMember(idx, 1)} />
                                                    <ChevronUp strokeWidth={1.6} className='stroke-slate-400 cursor-pointer hover:stroke-slate-700' onClick={() => moveMember(idx, -1)} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <p className="text-sm text-muted-foreground">현재 총원 {memberList.length}명</p>
                    <div className="space-x-2">
                        <Button
                            className="w-full sm:w-[8rem] h-9 bg-gray-100 hover:bg-gray-200 text-black"
                            onClick={() => {
                                resetCardReadState();
                                setAddMemberSkipCard(false);
                                setIsOpenAddMemberDialog(true);
                            }}
                        >
                            <UserPlus className="w-4 h-4 mr-1" />
                            새 구성원 추가
                        </Button>
                    </div>
                </div>
            </div>

            <AlertDialog open={isOpenDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>구성원 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            {currentMember ? `${currentMember.name}님을 정말 삭제할까요? 구성원을 삭제하면 해당 구성원의 출퇴근 기록도 함께 삭제돼요.` : ''}
                        </AlertDialogDescription>
                        {deleteError && <p className="text-red-500 text-sm mt-2">{deleteError}</p>}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => {
                                setIsOpenDeleteDialog(false);
                                setDeleteError('');
                                setCurrentMember(null);
                            }}>취소</AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold h-9 bg-red-500 text-white hover:bg-red-600"
                            onClick={deleteMember}>삭제</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isOpenAddMemberDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>새 구성원 추가</AlertDialogTitle>
                        <AlertDialogDescription>새로운 구성원의 정보를 입력하세요.</AlertDialogDescription>
                        <div className="space-y-4 mt-4">
                            <div>
                                <label className="text-sm font-medium">이름 *</label>
                                <Input value={addMemberName} onChange={(e) => setAddMemberName(e.target.value)} className="mt-1.5" placeholder="구성원 이름" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">직책 *</label>
                                <Select value={addMemberPosition} onValueChange={(v) => {
                                    setAddMemberPosition(v);
                                    if (v !== '2') setAddMemberSkipCard(false);
                                }}>
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue placeholder="직책 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">부원</SelectItem>
                                        <SelectItem value="1">랩장</SelectItem>
                                        <SelectItem value="2">수습부원</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">ID카드 일련번호 {addMemberSkipCard ? '' : '*'}</label>
                                {addMemberPosition === '2' && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Checkbox
                                            id="addMemberSkipCard"
                                            checked={addMemberSkipCard}
                                            onCheckedChange={(checked) => {
                                                const next = !!checked;
                                                setAddMemberSkipCard(next);
                                                if (next) {
                                                    setAddMemberCard('');
                                                    resetCardReadState();
                                                }
                                            }}
                                        />
                                        <label htmlFor="addMemberSkipCard" className="text-sm">나중에 등록</label>
                                    </div>
                                )}
                                {addMemberSkipCard ? (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        카드 발급 이후 &lsquo;카드&rsquo; 버튼을 눌러 등록해 주세요.
                                    </p>
                                ) : (
                                    <>
                                        <Input value={addMemberCard} onChange={(e) => setAddMemberCard(e.target.value)} className="mt-1.5" placeholder="ID 카드 일련번호" fontFamily="monospace" />
                                        <div className="flex items-center gap-2 mt-2">
                                            <Button
                                                type="button"
                                                className="h-8 bg-gray-100 hover:bg-gray-200 text-black"
                                                onClick={() => startCardRead('add')}
                                                disabled={cardReadStatus === 'waiting' && cardReadTarget === 'add'}
                                            >
                                                <Nfc className="w-4 h-4 mr-1" />
                                                {cardReadStatus === 'waiting' && cardReadTarget === 'add' ? '읽는 중...' : 'ID 카드 읽기'}
                                            </Button>
                                            {cardReadStatus === 'waiting' && cardReadTarget === 'add' && (
                                                <p className="text-xs text-muted-foreground">카드가 인식되면 일련번호가 자동으로 채워져요.</p>
                                            )}
                                        </div>
                                        {cardReadStatus === 'error' && cardReadTarget === 'add' && (
                                            <p className="text-xs text-red-500 mt-1">{cardReadError || '카드 읽기에 실패했어요.'}</p>
                                        )}
                                    </>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium">GitHub 닉네임</label>
                                <Input value={addMemberNickname} onChange={(e) => setAddMemberNickname(e.target.value)} className="mt-1.5" placeholder="프로필 사진을 불러올 GitHub 사용자 이름" />
                            </div>
                            {addMemberError && <p className="text-red-500 text-sm">{addMemberError}</p>}
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => {
                                resetCardReadState();
                                setIsOpenAddMemberDialog(false);
                                setAddMemberSkipCard(false);
                                setAddMemberError('');
                            }}>취소</AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold h-9 bg-gray-100 text-black hover:bg-gray-200"
                            onClick={addNewMember}>추가</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isOpenNameDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>이름 변경</AlertDialogTitle>
                        <AlertDialogDescription>새로운 이름을 입력하세요.</AlertDialogDescription>
                        <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-2" />
                        {nameError && <p className="text-red-500 text-sm mt-2">{nameError}</p>}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => { setIsOpenNameDialog(false); setNameError(''); }}>취소</AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold h-9 bg-gray-100 text-black hover:bg-gray-200"
                            onClick={updateName}>변경</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isOpenCardDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ID 카드 재등록</AlertDialogTitle>
                        <AlertDialogDescription>
                            새 ID 카드의 일련번호를 입력해 주세요.<br />
                            아래의 'ID 카드 읽기' 버튼으로 자동 등록하거나 직접 입력할 수도 있어요.
                        </AlertDialogDescription>
                        <Input value={newCard} onChange={(e) => setNewCard(e.target.value)} className="mt-2" />
                        <div className="flex items-center gap-2 mt-2">
                            <Button
                                type="button"
                                className="h-8 bg-gray-100 hover:bg-gray-200 text-black"
                                onClick={() => startCardRead('update')}
                                disabled={cardReadStatus === 'waiting' && cardReadTarget === 'update'}
                            >
                                <Nfc className="w-4 h-4 mr-1" />
                                {cardReadStatus === 'waiting' && cardReadTarget === 'update' ? '읽는 중...' : 'ID 카드 읽기'}
                            </Button>
                            {cardReadStatus === 'waiting' && cardReadTarget === 'update' && (
                                <p className="text-xs text-muted-foreground">카드가 인식되면 일련번호가 자동으로 채워집니다.</p>
                            )}
                        </div>
                        {cardError && <p className="text-red-500 text-sm mt-1">{cardError}</p>}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => {
                                resetCardReadState();
                                setCardError('');
                                setIsOpenCardDialog(false);
                            }}>취소</AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold h-9 bg-gray-100 text-black hover:bg-gray-200"
                            onClick={updateCard}>변경</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isOpenNicknameDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>프로필 사진 변경</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>
                                <p>월패드에 기본 이모지 대신 내 GitHub 계정의 프로필 사진을 불러와 표시할 수 있어요.</p>
                                <p>둘 다 설정된 경우 GitHub 프로필 사진이 우선적으로 표시돼요.</p>
                            </div>
                        </AlertDialogDescription>
                        <p className="mt-2 text-sm">GitHub 프로필 사진 연동</p>
                        <Input value={newNickname} onChange={(e) => setNewNickname(e.target.value)} placeholder="GitHub 사용자 이름 등록" className="mt-2 mb-2" />
                        {currentMember?.github && (
                            <AlertDialogAction
                                className="font-semibold h-9 bg-red-50 text-red-600 hover:bg-red-100"
                                onClick={() => {
                                    setNicknameError('');
                                    updateMemberField(currentMember.uuid, 'github', null)
                                        .then(({ ok, error }) => {
                                            if (ok) {
                                                setNewNickname('');
                                                setIsOpenNicknameDialog(false);
                                            } else {
                                                setNicknameError(error);
                                            }
                                        });
                                }}>삭제하고 이모지 사용</AlertDialogAction>
                        )}
                        <p className="mt-2 text-sm">프로필 이모지 바꾸기</p>
                        <div className="grid grid-cols-7 gap-2 mt-2 overflow-auto h-[10rem]" style={{ scrollbarWidth: 'thin' }}>
                            {emojiList.length === 0
                                ? Array.from({ length: 21 }).map((_, idx) => (
                                    <div key={idx} className="w-8 h-8 rounded-md bg-gray-200 animate-pulse" />
                                ))
                                : emojiList.map((emoji, idx) => (
                                    <Image
                                        src={`/emoji/${emoji}`}
                                        className={`rounded-md hover:grayscale-[50%] hover:scale-95 transition-transform duration-200 cursor-pointer ${selectedEmoji === emoji ? 'ring-2 ring-blue-500' : ''}`}
                                        width={32}
                                        height={32}
                                        quality={25}
                                        key={idx}
                                        alt={`emoji-${emoji}`}
                                        onClick={() => setSelectedEmoji(emoji)}
                                    />
                                ))}
                        </div>
                        {nicknameError && <p className="text-red-500 text-sm mt-2">{nicknameError}</p>}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => { setIsOpenNicknameDialog(false); setNicknameError(''); setSelectedEmoji(null); }}>취소</AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold h-9 bg-gray-100 text-black hover:bg-gray-200"
                            onClick={saveProfile}>저장</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isOpenPositionDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>직책 변경</AlertDialogTitle>
                        <AlertDialogDescription>새로운 직책을 선택하세요.</AlertDialogDescription>
                        <Select value={newPosition} onValueChange={setNewPosition}>
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="직책 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">부원</SelectItem>
                                <SelectItem value="1">랩장</SelectItem>
                                <SelectItem value="2">수습부원</SelectItem>
                            </SelectContent>
                        </Select>
                        {positionError && <p className="text-red-500 text-sm mt-2">{positionError}</p>}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="font-semibold border-0 h-9 bg-gray-100 hover:bg-gray-200"
                            onClick={() => { setIsOpenPositionDialog(false); setPositionError(''); }}>취소</AlertDialogCancel>
                        <AlertDialogAction
                            className="font-semibold h-9 bg-gray-100 text-black hover:bg-gray-200"
                            onClick={updatePosition}>변경</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
