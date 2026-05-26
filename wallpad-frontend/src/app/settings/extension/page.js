'use client'

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileCode, FilePlus, Pencil, Check, X } from 'lucide-react';

import { backendPort } from '../_lib/backend';
import { authFetch } from '../_lib/auth';
import { formatBackendError, formatThrownError } from '../_lib/error';

const DEFAULT_TEMPLATE = `const Extension = require("../Extension");\nmodule.exports = new Extension({\n    enabled: true,\n    activatedStatus: 1,\n    activatedIndex: '*'\n},\n    (userInfo, changedTo, memberList, ctx) => {\n     // 이곳에 이벤트 처리 동작을 구현하세요.\n     ctx.notify('처리 결과를 알림 화면에 표시할 수도 있어요.');\n    }\n);\n`;

export default function ExtensionSection() {
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [code, setCode] = useState('');
    const [originalCode, setOriginalCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState(null);
    const [isNewFile, setIsNewFile] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [renamingFile, setRenamingFile] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    const baseURL = typeof window !== 'undefined' ? `http://${location.hostname}:${backendPort}` : '';

    function fetchFileList() {
        const url = new URL('/wallpad/management/extension/list', baseURL);
        authFetch(url)
            .then(res => res.json())
            .then(body => { if (body.status) setFiles(body.files); })
            .catch(err => console.error('[ExtensionSection] Failed to fetch file list:', err));
    }

    useEffect(() => { fetchFileList(); }, []);

    function openFile(filename) {
        setLoading(true);
        setStatusMsg(null);
        setIsNewFile(false);
        setNewFileName('');
        setRenamingFile(null);
        const url = new URL(`/wallpad/management/extension/read/${encodeURIComponent(filename)}`, baseURL);
        authFetch(url)
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setSelectedFile(filename);
                    setCode(body.content);
                    setOriginalCode(body.content);
                } else {
                    setStatusMsg('파일을 불러올 수 없어요.');
                }
            })
            .catch(() => setStatusMsg('파일을 불러올 수 없어요.'))
            .finally(() => setLoading(false));
    }

    function saveFile() {
        const filename = isNewFile ? newFileName : selectedFile;
        if (!filename) return;

        if (isNewFile && !filename.endsWith('.js')) {
            setStatusMsg('파일 이름은 .js로 끝나야 해요.');
            return;
        }

        setSaving(true);
        setStatusMsg(null);
        const url = new URL('/wallpad/management/extension/save', baseURL);
        authFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, content: code })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setStatusMsg(body.restarting
                        ? '저장되었어요. 변경 사항을 적용하기 위해 백엔드를 재시작하고 있어요...'
                        : '저장되었어요.');
                    setOriginalCode(code);
                    if (isNewFile) {
                        setIsNewFile(false);
                        setSelectedFile(filename);
                        setNewFileName('');
                        fetchFileList();
                    }
                } else {
                    setStatusMsg('저장에 실패했어요: ' + formatBackendError(body, ''));
                }
            })
            .catch((err) => setStatusMsg('저장에 실패했어요: ' + formatThrownError(err, '')))
            .finally(() => setSaving(false));
    }

    function deleteFile() {
        if (!selectedFile) return;
        setDeleting(true);
        setStatusMsg(null);
        setDeleteError('');
        const url = new URL('/wallpad/management/extension/delete', baseURL);
        authFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: selectedFile })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setStatusMsg(body.restarting
                        ? '삭제되었어요. 변경 사항을 적용하기 위해 백엔드를 재시작하고 있어요...'
                        : '삭제되었어요.');
                    setSelectedFile(null);
                    setCode('');
                    setOriginalCode('');
                    fetchFileList();
                    setShowDeleteDialog(false);
                } else {
                    setDeleteError(formatBackendError(body, '삭제에 실패했어요.'));
                }
            })
            .catch((err) => setDeleteError(formatThrownError(err, '삭제에 실패했어요.')))
            .finally(() => {
                setDeleting(false);
            });
    }

    function startNewFile() {
        setIsNewFile(true);
        setSelectedFile(null);
        setNewFileName('');
        setCode(DEFAULT_TEMPLATE);
        setOriginalCode(DEFAULT_TEMPLATE);
        setStatusMsg(null);
        setRenamingFile(null);
    }

    function startRename(filename) {
        setRenamingFile(filename);
        setRenameValue(filename);
    }

    function confirmRename(oldFilename) {
        const newFilename = renameValue.trim();
        if (!newFilename || newFilename === oldFilename) {
            setRenamingFile(null);
            return;
        }
        if (!newFilename.endsWith('.js')) {
            setStatusMsg('파일 이름은 .js로 끝나야 해요.');
            return;
        }
        setStatusMsg(null);
        const url = new URL('/wallpad/management/extension/rename', baseURL);
        authFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldFilename, newFilename })
        })
            .then(res => res.json())
            .then(body => {
                if (body.status) {
                    setStatusMsg(body.restarting
                        ? '파일 이름이 변경되었어요. 변경 사항을 적용하기 위해 백엔드를 재시작하고 있어요...'
                        : '파일 이름이 변경되었어요.');
                    if (selectedFile === oldFilename) setSelectedFile(newFilename);
                    fetchFileList();
                } else {
                    setStatusMsg('이름 변경에 실패했어요: ' + formatBackendError(body, ''));
                }
            })
            .catch((err) => setStatusMsg('이름 변경에 실패했어요: ' + formatThrownError(err, '')))
            .finally(() => setRenamingFile(null));
    }

    const hasUnsavedChanges = code !== originalCode;

    const highlightCode = (code) => {
        if (typeof window !== 'undefined') {
            const Prism = require('prismjs');
            require('prismjs/components/prism-javascript');
            return Prism.highlight(code, Prism.languages.javascript, 'javascript');
        }
        return code;
    };

    const Editor = typeof window !== 'undefined' ? require('react-simple-code-editor').default : null;

    return (
        <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Label className="text-sm font-semibold mr-1"><FileCode className="w-3.5 h-3.5 inline mr-1 mb-0.5" />스크립트 파일</Label>
                {files.map(f => (
                    <div key={f} className="flex items-center gap-0.5">
                        <Button
                            variant={selectedFile === f && !isNewFile ? 'default' : 'outline'}
                            size="sm"
                            className="text-xs"
                            onClick={() => openFile(f)}
                        >
                            {f}
                        </Button>
                    </div>
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-dashed"
                    onClick={startNewFile}
                >
                    <FilePlus className="w-3.5 h-3.5 mr-1" />
                    새 파일
                </Button>
            </div>

            {isNewFile && (
                <div className="flex items-center gap-2 mb-4">
                    <Label className="text-sm font-medium whitespace-nowrap">파일 이름</Label>
                    <Input
                        className="max-w-[18rem] text-sm font-mono"
                        placeholder="MyExtension.js"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                    />
                </div>
            )}

            {(selectedFile || isNewFile) && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                            {isNewFile ? (
                                <Label className="text-sm font-semibold">
                                    {newFileName || '새 파일'}
                                    {hasUnsavedChanges && <span className="text-orange-500 ml-1">●</span>}
                                </Label>
                            ) : renamingFile === selectedFile ? (
                                <>
                                    <Input
                                        className="h-7 text-xs font-mono w-[14rem]"
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') confirmRename(selectedFile);
                                            if (e.key === 'Escape') setRenamingFile(null);
                                        }}
                                        autoFocus
                                    />
                                    <button className="p-0.5 hover:bg-gray-200 rounded" onClick={() => confirmRename(selectedFile)} title="확인">
                                        <Check className="w-3.5 h-3.5 text-green-600" />
                                    </button>
                                    <button className="p-0.5 hover:bg-gray-200 rounded" onClick={() => setRenamingFile(null)} title="취소">
                                        <X className="w-3.5 h-3.5 text-gray-500" />
                                    </button>
                                    {hasUnsavedChanges && <span className="text-orange-500 ml-1">●</span>}
                                </>
                            ) : (
                                <>
                                    <Label className="text-sm font-semibold">
                                        {selectedFile}
                                        {hasUnsavedChanges && <span className="text-orange-500 ml-1">●</span>}
                                    </Label>
                                    <button
                                        className="p-0.5 hover:bg-gray-200 rounded"
                                        onClick={() => startRename(selectedFile)}
                                        title="이름 변경"
                                    >
                                        <Pencil className="w-3 h-3 text-gray-500" />
                                    </button>
                                </>
                            )}
                        </div>
                        <div className="flex gap-3 items-center">
                            {!isNewFile && selectedFile && (
                                <button
                                    className="text-sm text-red-500 hover:underline disabled:opacity-50"
                                    onClick={() => setShowDeleteDialog(true)}
                                >
                                    삭제
                                </button>
                            )}
                            <button
                                className="text-sm text-black hover:underline disabled:opacity-50"
                                onClick={saveFile}
                                disabled={saving || (isNewFile && !newFileName)}
                            >
                                {saving ? '저장 중' : '저장'}
                            </button>
                        </div>
                    </div>
                    <div className="border rounded-md overflow-hidden" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                        {Editor && (
                            <Editor
                                value={code}
                                onValueChange={setCode}
                                highlight={highlightCode}
                                padding={12}
                                style={{
                                    fontFamily: '"Fira Code", "Fira Mono", monospace',
                                    fontSize: 13,
                                    minHeight: '20rem',
                                    backgroundColor: '#fafafa',
                                    lineHeight: '1.5',
                                }}
                                textareaClassName="code-editor-textarea"
                                preClassName="code-editor-pre"
                            />
                        )}
                    </div>
                </div>
            )}

            {loading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}

            {statusMsg && (
                <p className="text-sm font-medium mt-2" style={{ color: statusMsg.includes('실패') || statusMsg.includes('없') ? '#dc2626' : '#16a34a' }}>
                    {statusMsg}
                </p>
            )}

            <AlertDialog open={showDeleteDialog} onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) setDeleteError(''); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>파일 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                            <strong>{selectedFile}</strong> 파일을 삭제하시겠어요? 삭제된 파일은 복구할 수 없어요.
                        </AlertDialogDescription>
                        {deleteError && <p className="text-red-500 text-sm mt-2">{deleteError}</p>}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteFile} disabled={deleting}>
                            {deleting ? '삭제 중...' : '삭제'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
