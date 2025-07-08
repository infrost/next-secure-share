// app/TranslateButton.tsx
"use client";

import { useState, useEffect } from 'react';
import Script from 'next/script';

// 图标组件 (保持不变)
const LanguageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-gray-700 group-hover:text-blue-600 transition-colors">
        <path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" />
    </svg>
);

// 辅助函数：用于在客户端安全地读取cookie
const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null;
    }
    return null;
};

export default function TranslateButton() {
    const [showPrompt, setShowPrompt] = useState(false);
    // 跟踪当前页面是否已被翻译为英文
    const [isTranslated, setIsTranslated] = useState(false);

    // 仅在组件首次挂载时运行，用于同步状态和决定是否显示提示
    useEffect(() => {
        // 1. 从Cookie中读取翻译状态，并设置组件的state
        const transCookie = getCookie('googtrans');
        const currentlyTranslated = transCookie?.includes('/en') || false;
        setIsTranslated(currentlyTranslated);

        // 2. 根据浏览器语言和当前是否已翻译，决定是否显示“需要翻译吗？”的提示
        const nav = navigator as Navigator & { userLanguage?: string };
        const userLanguage = nav.language || nav.userLanguage;

        if (!currentlyTranslated && userLanguage && !userLanguage.toLowerCase().startsWith('zh')) {
            // 使用一个短暂的延时，避免页面刚加载就弹出提示，影响体验
            const timer = setTimeout(() => setShowPrompt(true), 2500);
            return () => clearTimeout(timer); // 组件卸载时清除计时器
        }
    }, []); // 空依赖数组确保此Effect仅在客户端首次挂载时运行一次

    const handleTranslateToggle = () => {
        // 用户点击后，总是先隐藏提示框
        setShowPrompt(false);

        // 根据当前状态决定目标语言
        const targetLanguage = isTranslated ? 'zh-CN' : 'en';
        
        // 核心：设置Cookie，然后重新加载页面以应用翻译
        // 这是确保在所有设备（尤其是iOS）上可靠工作的关键步骤
        document.cookie = `googtrans=/auto/${targetLanguage};path=/`;
        window.location.reload();
    };

    return (
        <>
            <div className="group fixed bottom-5 right-5 z-50 flex items-center">
                {/* 条件渲染的提示框 */}
                {showPrompt && (
                    <div className="bg-blue-600 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-lg mr-3 transition-opacity duration-300 ease-in-out">
                        Need translation?
                    </div>
                )}

                {/* 浮动按钮 */}
                <button
                    onClick={handleTranslateToggle}
                    className="flex items-center justify-center bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-gray-50"
                    aria-label={isTranslated ? "Show original language" : "Translate to English"}
                >
                    <LanguageIcon />
                </button>
            </div>

            {/* 谷歌翻译小部件的容器 (保持隐藏) */}
            {/* 使用CSS移出屏幕而不是display:none，以确保其脚本能正确初始化 */}
            <div id="google_translate_element" className="google-translate-container"></div>
            <style jsx global>{`
                .google-translate-container {
                    position: absolute !important;
                    top: -1000px !important;
                    left: -1000px !important;
                    height: 0px !important;
                    width: 0px !important;
                    overflow: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }
                body {
                    top: 0 !important;
                }
            `}</style>
            
            {/* 无条件加载Google翻译脚本，确保翻译引擎随时待命 */}
            <Script id="google-translate-init" strategy="afterInteractive">
                {`
                    function googleTranslateElementInit() {
                        new google.translate.TranslateElement(
                            { 
                                pageLanguage: 'zh-CN', 
                                autoDisplay: false 
                            },
                            'google_translate_element'
                        );
                    }
                `}
            </Script>
            <Script
                id="google-translate-script"
                strategy="afterInteractive"
                src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
            />
        </>
    );
}