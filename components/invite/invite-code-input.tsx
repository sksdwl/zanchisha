'use client';

import React, { useState, useRef, useEffect } from 'react';
import { validateInviteCode, saveInviteCode, InviteCode } from '@/lib/invite-code';

interface InviteCodeInputProps {
  onSuccess: (inviteCode: InviteCode) => void;
}

export function InviteCodeInput({ onSuccess }: InviteCodeInputProps) {
  const [code, setCode] = useState<string[]>(new Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 自动聚焦第一个输入框
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // 只允许数字
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    // 只取最后一个字符
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');

    // 自动跳到下一个输入框
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // 检查是否输入完成
    if (index === 5 && value) {
      const fullCode = [...newCode.slice(0, 5), value.slice(-1)].join('');
      if (fullCode.length === 6) {
        handleSubmit(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // 退格键处理
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split('');
      setCode(newCode);
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (fullCode: string) => {
    if (fullCode.length !== 6) {
      setError('请输入完整的6位邀请码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await validateInviteCode(fullCode);
      
      if (result.valid && result.inviteCode) {
        saveInviteCode(fullCode);
        onSuccess(result.inviteCode);
      } else {
        setError(result.message || '邀请码无效');
        // 清空输入
        setCode(new Array(6).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err.message || '验证失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setCode(new Array(6).fill(''));
    setError('');
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-auto">
      {/* 图标 */}
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg">
          <span className="text-4xl">🔐</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">输入邀请码</h2>
        <p className="text-gray-500 text-sm">
          请输入6位数字邀请码进入群聊
        </p>
      </div>

      {/* 输入框 */}
      <div className="flex justify-center gap-2 mb-6">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={el => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={isLoading}
            className={`
              w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 
              transition-all duration-200
              ${digit 
                ? 'border-orange-500 bg-orange-50 text-orange-600' 
                : 'border-gray-200 bg-gray-50 text-gray-800'
              }
              ${error ? 'border-red-300' : ''}
              focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200
              disabled:opacity-50
            `}
          />
        ))}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-2 text-red-500 text-xs hover:underline"
          >
            重新输入
          </button>
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-orange-600">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm">验证中...</span>
          </div>
        </div>
      )}

      {/* 示例邀请码 */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center mb-2">测试邀请码</p>
        <div className="flex justify-center gap-2">
          {['123456', '888888', '666666'].map(c => (
            <button
              key={c}
              onClick={() => {
                setCode(c.split(''));
                handleSubmit(c);
              }}
              disabled={isLoading}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
