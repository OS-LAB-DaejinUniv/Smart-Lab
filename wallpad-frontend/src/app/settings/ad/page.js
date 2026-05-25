'use client'

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Upload } from 'lucide-react';

import { backendPort } from '../_lib/backend';
import { authFetch } from '../_lib/auth';

export default function AdsSection() {
    let [adList, setAdList] = useState([]);
    let [isDraggingOver, setIsDraggingOver] = useState(false);
    let [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // dragenter/leave fire per descendant so we keep a depth counter to
    // know when the cursor has truly left the page wrapper. Otherwise the
    // overlay would flicker as the user moves over child elements.
    const dragDepthRef = useRef(0);

    const imageURL = (id) => new URL(`/wallpad/ad/${id}`, `http://${location.hostname}:${backendPort}`).href;
    const updateListURL = () => new URL(`/wallpad/ad/reorder`, `http://${location.hostname}:${backendPort}`).href;

    const uploadImage = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            toast.error('이미지 파일만 업로드할 수 있어요.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('파일이 너무 커요.', { description: '2MB 이하만 업로드할 수 있어요.' });
            return;
        }
        setIsUploading(true);
        const formData = new FormData();
        formData.append('inputImage', file);

        const uploadURL = new URL('/wallpad/ad/upload', `http://${location.hostname}:${backendPort}`);
        authFetch(uploadURL, {
            method: 'POST',
            body: formData
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    toast.success('이미지를 업로드했어요.');
                    fetchAdList();
                } else {
                    throw new Error();
                }
            })
            .catch(() => {
                toast.error('업로드에 실패했어요.');
            })
            .finally(() => setIsUploading(false));
    };

    const handleDrop = (e) => {
        e.preventDefault();
        dragDepthRef.current = 0;
        setIsDraggingOver(false);
        // Only handle external file drops; ignore drags originating inside the page.
        const file = e.dataTransfer.files?.[0];
        if (file) uploadImage(file);
    };

    const handleDragOver = (e) => {
        // Required to allow drop. Don't toggle state here — dragover fires
        // repeatedly and would cause re-renders.
        if (e.dataTransfer.types?.includes('Files')) e.preventDefault();
    };

    const handleDragEnter = (e) => {
        if (!e.dataTransfer.types?.includes('Files')) return;
        e.preventDefault();
        dragDepthRef.current += 1;
        if (dragDepthRef.current === 1) setIsDraggingOver(true);
    };

    const handleDragLeave = (e) => {
        if (!e.dataTransfer.types?.includes('Files')) return;
        e.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setIsDraggingOver(false);
    };

    const handleFileInput = (e) => {
        const file = e.target.files?.[0];
        if (file) uploadImage(file);
        e.target.value = '';
    };

    const applyAdOrder = (newList) => {
        authFetch(updateListURL(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rmcache: true, adList: newList })
        })
            .then(resp => resp.json())
            .then(body => {
                if (body.status) console.log('successfully updated ad order.');
            })
            .catch(err => console.error('failed to update ad order.', err));
    };

    const moveAd = (idx, direction) => {
        const newList = [...adList];
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= newList.length) return;
        [newList[idx], newList[targetIdx]] = [newList[targetIdx], newList[idx]];
        setAdList(newList);
        applyAdOrder(newList);
    };

    const deleteAd = (adId) => {
        const deleteURL = new URL(`/wallpad/ad/remove/${adId}`, `http://${location.hostname}:${backendPort}`);
        authFetch(deleteURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rmcache: true })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) fetchAdList();
            })
            .catch(err => console.error('Failed to delete ad:', err));
    };

    useEffect(() => { fetchAdList(); }, []);

    function fetchAdList() {
        fetch(new URL('/wallpad/ad/list', `http://${location.hostname}:${backendPort}`))
            .then(res => res.json())
            .then(json => setAdList(json.list))
            .catch(err => console.error('failed to fetch ad list.', err));
    }

    return (
        <div
            className="relative flex flex-col space-y-5 min-h-[20rem]"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
        >
            <div>
                <h2 className="text-base font-semibold mb-1">새 이미지 업로드</h2>
                <p className="text-sm text-muted-foreground mb-3">
                    이미지를 이곳에 끌어다 놓거나, 아래 버튼으로 업로드할 이미지를 선택하세요. 권장 해상도 1416×460
                </p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInput}
                />
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                >
                    <Upload className="w-4 h-4 mr-1.5" />
                    {isUploading ? '업로드 중...' : '파일 선택'}
                </Button>
            </div>

            <div>
                <h2 className="text-base font-semibold mb-1">표시 순서 변경 및 삭제</h2>
                <p className="text-sm text-muted-foreground mb-3">
                    화살표로 이미지의 순서를 변경하거나 삭제할 수 있어요.
                </p>
                <div className='rounded-md py-2.5 px-3 sm:px-5 w-full max-w-[28rem] bg-slate-100'>
                    {adList.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            등록된 광고 이미지가 없어요.
                        </p>
                    ) : (
                        <div className='space-y-4 py-2'>
                            {adList.map((item, index) => (
                                <div key={item} className="relative flex items-center gap-2">
                                    <div className="flex flex-col">
                                        <ChevronUp strokeWidth={1.6}
                                            className='stroke-slate-400 cursor-pointer hover:stroke-slate-700 w-5 h-5'
                                            onClick={() => moveAd(index, -1)} />
                                        <ChevronDown strokeWidth={1.6}
                                            className='stroke-slate-400 cursor-pointer hover:stroke-slate-700 w-5 h-5'
                                            onClick={() => moveAd(index, 1)} />
                                    </div>
                                    <div className="relative flex-1">
                                        <div className="absolute flex right-[.5rem] top-[.5rem] space-x-1.5">
                                            <p className="font-medium text-sm tabular-nums tracking-wider bg-[#f2f4f6] opacity-90 rounded-full py-[.04rem] px-1.5">
                                                {`${index + 1}/${adList.length}`}
                                            </p>
                                            <p
                                                className="font-medium text-sm bg-[#f2f4f6] hover:bg-red-600 hover:text-gray-50 opacity-90 rounded-full py-[.04rem] px-2 cursor-pointer"
                                                onClick={() => deleteAd(item)}
                                            >
                                                삭제
                                            </p>
                                        </div>
                                        <img
                                            src={imageURL(item)}
                                            className='rounded-md w-full'
                                            alt='ad_image'
                                            onError={() => console.error('error occured during fetch: ', item)}
                                            style={{
                                                objectFit: 'cover',
                                                maxWidth: '100%',
                                                height: 'auto',
                                                aspectRatio: '1416/460'
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Drag overlay: spans the entire section while a file is being dragged
                over it. pointer-events-none keeps the underlying drag events flowing
                so the page wrapper still receives drop. */}
            {isDraggingOver && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-500 bg-blue-50/80 pointer-events-none">
                    <div className="flex flex-col items-center text-blue-700">
                        <Upload className="w-8 h-8 mb-2" />
                        <p className="text-sm font-medium">여기에 이미지를 놓으세요</p>
                    </div>
                </div>
            )}
        </div>
    );
}
