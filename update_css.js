const fs = require('fs');

const cssPath = 'd:/widget/src/renderer/src/styles/index.css';
let content = fs.readFileSync(cssPath, 'utf8');

const startPattern = '/* ===== 기본 테마 (NICE 에듀 스타일 - Light & Blue) ===== */';
const endPattern = '/* ===== 공통 컴포넌트 스타일 ===== */';

const startIndex = content.indexOf(startPattern);
const endIndex = content.indexOf(endPattern);

if (startIndex !== -1 && endIndex !== -1) {
  const newThemes = `/* ===== 전역 글자 크기 (1~5단계) ===== */
html.text-size-1 { font-size: 12px; }
html.text-size-2 { font-size: 14px; }
html.text-size-3 { font-size: 16px; }
html.text-size-4 { font-size: 18px; }
html.text-size-5 { font-size: 20px; }

/* ===== 20가지 신규 테마 (가독성 최우선) ===== */

/* 1. 클래식 라이트 */
html.theme-light {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f1f5f9;
  --bg-sidebar: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  --bg-titlebar: #ffffff;
  --bg-card: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #334155;
  --text-muted: #64748b;
  --text-sidebar: #ffffff;
  --text-sidebar-muted: rgba(255, 255, 255, 0.7);
  --border: rgba(15, 23, 42, 0.1);
  --accent-blue: #2563eb;
  --accent-mint: #059669;
  --accent-purple: #7c3aed;
  --accent-orange: #ea580c;
  --accent-red: #dc2626;
  --accent-green: #16a34a;
  --shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 4px rgba(0, 0, 0, 0.03);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 2. 클래식 다크 */
html.theme-dark {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #172032;
  --bg-sidebar: rgba(15,23,42,0.95);
  --bg-titlebar: #1e293b;
  --bg-card: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --text-sidebar: #f8fafc;
  --text-sidebar-muted: #cbd5e1;
  --border: rgba(248, 250, 252, 0.1);
  --accent-blue: #3b82f6;
  --accent-mint: #10b981;
  --accent-purple: #8b5cf6;
  --accent-orange: #f59e0b;
  --accent-red: #ef4444;
  --accent-green: #22c55e;
  --shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 3. 오션 딥 블루 */
html.theme-ocean {
  --bg-primary: #082f49;
  --bg-secondary: #0c4a6e;
  --bg-tertiary: #042f2e;
  --bg-sidebar: #075985;
  --bg-titlebar: #0c4a6e;
  --bg-card: #0c4a6e;
  --text-primary: #f0f9ff;
  --text-secondary: #bae6fd;
  --text-muted: #7dd3fc;
  --text-sidebar: #f0f9ff;
  --text-sidebar-muted: #bae6fd;
  --border: rgba(240, 249, 255, 0.15);
  --accent-blue: #38bdf8;
  --accent-mint: #2dd4bf;
  --accent-purple: #c084fc;
  --accent-orange: #fbbf24;
  --accent-red: #f87171;
  --accent-green: #34d399;
  --shadow: 0 4px 24px rgba(8, 47, 73, 0.5);
  --shadow-sm: 0 2px 8px rgba(8, 47, 73, 0.3);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 4. 포레스트 그린 */
html.theme-forest {
  --bg-primary: #064e3b;
  --bg-secondary: #065f46;
  --bg-tertiary: #022c22;
  --bg-sidebar: #047857;
  --bg-titlebar: #065f46;
  --bg-card: #065f46;
  --text-primary: #ecfdf5;
  --text-secondary: #a7f3d0;
  --text-muted: #6ee7b7;
  --text-sidebar: #ecfdf5;
  --text-sidebar-muted: #a7f3d0;
  --border: rgba(236, 253, 245, 0.15);
  --accent-blue: #60a5fa;
  --accent-mint: #34d399;
  --accent-purple: #a78bfa;
  --accent-orange: #fbbf24;
  --accent-red: #f87171;
  --accent-green: #4ade80;
  --shadow: 0 4px 24px rgba(6, 78, 59, 0.5);
  --shadow-sm: 0 2px 8px rgba(6, 78, 59, 0.3);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 5. 선셋 글로우 */
html.theme-sunset {
  --bg-primary: #fff7ed;
  --bg-secondary: #ffedd5;
  --bg-tertiary: #ffeaec;
  --bg-sidebar: linear-gradient(180deg, #ea580c 0%, #c2410c 100%);
  --bg-titlebar: #ffedd5;
  --bg-card: #ffffff;
  --text-primary: #431407;
  --text-secondary: #7c2d12;
  --text-muted: #9a3412;
  --text-sidebar: #ffffff;
  --text-sidebar-muted: #ffedd5;
  --border: rgba(67, 20, 7, 0.1);
  --accent-blue: #0284c7;
  --accent-mint: #0d9488;
  --accent-purple: #7e22ce;
  --accent-orange: #ea580c;
  --accent-red: #dc2626;
  --accent-green: #16a34a;
  --shadow: 0 4px 12px rgba(194, 65, 12, 0.1);
  --shadow-sm: 0 1px 4px rgba(194, 65, 12, 0.05);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 6. 라벤더 미스트 */
html.theme-lavender {
  --bg-primary: #faf5ff;
  --bg-secondary: #f3e8ff;
  --bg-tertiary: #fdf4ff;
  --bg-sidebar: linear-gradient(180deg, #9333ea 0%, #7e22ce 100%);
  --bg-titlebar: #f3e8ff;
  --bg-card: #ffffff;
  --text-primary: #3b0764;
  --text-secondary: #581c87;
  --text-muted: #7e22ce;
  --text-sidebar: #ffffff;
  --text-sidebar-muted: #f3e8ff;
  --border: rgba(59, 7, 100, 0.1);
  --accent-blue: #2563eb;
  --accent-mint: #059669;
  --accent-purple: #9333ea;
  --accent-orange: #ea580c;
  --accent-red: #dc2626;
  --accent-green: #16a34a;
  --shadow: 0 4px 12px rgba(126, 34, 206, 0.1);
  --shadow-sm: 0 1px 4px rgba(126, 34, 206, 0.05);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 7. 모노크롬 시크 */
html.theme-monochrome {
  --bg-primary: #18181b;
  --bg-secondary: #27272a;
  --bg-tertiary: #09090b;
  --bg-sidebar: #09090b;
  --bg-titlebar: #27272a;
  --bg-card: #27272a;
  --text-primary: #fafafa;
  --text-secondary: #d4d4d8;
  --text-muted: #a1a1aa;
  --text-sidebar: #fafafa;
  --text-sidebar-muted: #d4d4d8;
  --border: rgba(250, 250, 250, 0.15);
  --accent-blue: #fafafa;
  --accent-mint: #e4e4e7;
  --accent-purple: #d4d4d8;
  --accent-orange: #a1a1aa;
  --accent-red: #f87171;
  --accent-green: #4ade80;
  --shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.4);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 8. 레트로 바이브 */
html.theme-retro {
  --bg-primary: #fef3c7;
  --bg-secondary: #fde68a;
  --bg-tertiary: #fef9c3;
  --bg-sidebar: #b45309;
  --bg-titlebar: #fde68a;
  --bg-card: #ffffff;
  --text-primary: #451a03;
  --text-secondary: #78350f;
  --text-muted: #92400e;
  --text-sidebar: #fef3c7;
  --text-sidebar-muted: #fde68a;
  --border: rgba(69, 26, 3, 0.15);
  --accent-blue: #0369a1;
  --accent-mint: #0f766e;
  --accent-purple: #6d28d9;
  --accent-orange: #b45309;
  --accent-red: #b91c1c;
  --accent-green: #15803d;
  --shadow: 0 4px 12px rgba(180, 83, 9, 0.15);
  --shadow-sm: 0 1px 4px rgba(180, 83, 9, 0.1);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 9. 네온 시티 */
html.theme-neon {
  --bg-primary: #020617;
  --bg-secondary: #0f172a;
  --bg-tertiary: #000000;
  --bg-sidebar: #000000;
  --bg-titlebar: #0f172a;
  --bg-card: #0f172a;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #64748b;
  --text-sidebar: #f8fafc;
  --text-sidebar-muted: #cbd5e1;
  --border: #334155;
  --accent-blue: #0ea5e9;
  --accent-mint: #14b8a6;
  --accent-purple: #d946ef;
  --accent-orange: #f59e0b;
  --accent-red: #f43f5e;
  --accent-green: #10b981;
  --shadow: 0 0 15px rgba(217, 70, 239, 0.3);
  --shadow-sm: 0 0 5px rgba(14, 165, 233, 0.3);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 10. 프레시 민트 */
html.theme-mint {
  --bg-primary: #f0fdfa;
  --bg-secondary: #ccfbf1;
  --bg-tertiary: #e0f2fe;
  --bg-sidebar: linear-gradient(180deg, #0d9488 0%, #0f766e 100%);
  --bg-titlebar: #ccfbf1;
  --bg-card: #ffffff;
  --text-primary: #134e4a;
  --text-secondary: #115e59;
  --text-muted: #0f766e;
  --text-sidebar: #f0fdfa;
  --text-sidebar-muted: #ccfbf1;
  --border: rgba(19, 78, 74, 0.1);
  --accent-blue: #0284c7;
  --accent-mint: #0d9488;
  --accent-purple: #7e22ce;
  --accent-orange: #ea580c;
  --accent-red: #dc2626;
  --accent-green: #16a34a;
  --shadow: 0 4px 12px rgba(15, 118, 110, 0.1);
  --shadow-sm: 0 1px 4px rgba(15, 118, 110, 0.05);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 11. 로즈 골드 */
html.theme-rose {
  --bg-primary: #fff1f2;
  --bg-secondary: #ffe4e6;
  --bg-tertiary: #fdf2f8;
  --bg-sidebar: linear-gradient(180deg, #e11d48 0%, #be123c 100%);
  --bg-titlebar: #ffe4e6;
  --bg-card: #ffffff;
  --text-primary: #881337;
  --text-secondary: #9f1239;
  --text-muted: #be123c;
  --text-sidebar: #fff1f2;
  --text-sidebar-muted: #ffe4e6;
  --border: rgba(136, 19, 55, 0.1);
  --accent-blue: #2563eb;
  --accent-mint: #059669;
  --accent-purple: #7c3aed;
  --accent-orange: #ea580c;
  --accent-red: #e11d48;
  --accent-green: #16a34a;
  --shadow: 0 4px 12px rgba(190, 18, 60, 0.1);
  --shadow-sm: 0 1px 4px rgba(190, 18, 60, 0.05);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 12. 스카이 브리즈 */
html.theme-sky {
  --bg-primary: #f0f9ff;
  --bg-secondary: #e0f2fe;
  --bg-tertiary: #f0fdf4;
  --bg-sidebar: linear-gradient(180deg, #0284c7 0%, #0369a1 100%);
  --bg-titlebar: #e0f2fe;
  --bg-card: #ffffff;
  --text-primary: #082f49;
  --text-secondary: #0c4a6e;
  --text-muted: #075985;
  --text-sidebar: #f0f9ff;
  --text-sidebar-muted: #e0f2fe;
  --border: rgba(8, 47, 73, 0.1);
  --accent-blue: #0284c7;
  --accent-mint: #0d9488;
  --accent-purple: #7e22ce;
  --accent-orange: #ea580c;
  --accent-red: #dc2626;
  --accent-green: #16a34a;
  --shadow: 0 4px 12px rgba(7, 89, 133, 0.1);
  --shadow-sm: 0 1px 4px rgba(7, 89, 133, 0.05);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 13. 피치 코랄 */
html.theme-peach {
  --bg-primary: #fef2f2;
  --bg-secondary: #fee2e2;
  --bg-tertiary: #fff7ed;
  --bg-sidebar: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
  --bg-titlebar: #fee2e2;
  --bg-card: #ffffff;
  --text-primary: #450a0a;
  --text-secondary: #7f1d1d;
  --text-muted: #991b1b;
  --text-sidebar: #fef2f2;
  --text-sidebar-muted: #fee2e2;
  --border: rgba(69, 10, 10, 0.1);
  --accent-blue: #2563eb;
  --accent-mint: #059669;
  --accent-purple: #7c3aed;
  --accent-orange: #ea580c;
  --accent-red: #ef4444;
  --accent-green: #16a34a;
  --shadow: 0 4px 12px rgba(220, 38, 38, 0.1);
  --shadow-sm: 0 1px 4px rgba(220, 38, 38, 0.05);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 14. 슬레이트 그레이 */
html.theme-slate {
  --bg-primary: #f8fafc;
  --bg-secondary: #f1f5f9;
  --bg-tertiary: #e2e8f0;
  --bg-sidebar: #334155;
  --bg-titlebar: #f1f5f9;
  --bg-card: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #1e293b;
  --text-muted: #475569;
  --text-sidebar: #f8fafc;
  --text-sidebar-muted: #e2e8f0;
  --border: rgba(15, 23, 42, 0.15);
  --accent-blue: #3b82f6;
  --accent-mint: #10b981;
  --accent-purple: #8b5cf6;
  --accent-orange: #f59e0b;
  --accent-red: #ef4444;
  --accent-green: #22c55e;
  --shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
  --shadow-sm: 0 1px 4px rgba(15, 23, 42, 0.05);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 15. 모닝 커피 */
html.theme-coffee {
  --bg-primary: #f5f5f4;
  --bg-secondary: #e7e5e4;
  --bg-tertiary: #d6d3d1;
  --bg-sidebar: #57534e;
  --bg-titlebar: #e7e5e4;
  --bg-card: #ffffff;
  --text-primary: #1c1917;
  --text-secondary: #292524;
  --text-muted: #44403c;
  --text-sidebar: #f5f5f4;
  --text-sidebar-muted: #d6d3d1;
  --border: rgba(28, 25, 23, 0.15);
  --accent-blue: #0284c7;
  --accent-mint: #0d9488;
  --accent-purple: #7e22ce;
  --accent-orange: #ea580c;
  --accent-red: #dc2626;
  --accent-green: #16a34a;
  --shadow: 0 4px 12px rgba(68, 64, 60, 0.1);
  --shadow-sm: 0 1px 4px rgba(68, 64, 60, 0.05);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 16. 체리 블라썸 */
html.theme-cherry {
  --bg-primary: #fdf2f8;
  --bg-secondary: #fbcfe8;
  --bg-tertiary: #fce7f3;
  --bg-sidebar: linear-gradient(180deg, #db2777 0%, #be185d 100%);
  --bg-titlebar: #fbcfe8;
  --bg-card: #ffffff;
  --text-primary: #831843;
  --text-secondary: #9d174d;
  --text-muted: #be185d;
  --text-sidebar: #fdf2f8;
  --text-sidebar-muted: #fbcfe8;
  --border: rgba(131, 24, 67, 0.1);
  --accent-blue: #2563eb;
  --accent-mint: #059669;
  --accent-purple: #7c3aed;
  --accent-orange: #ea580c;
  --accent-red: #db2777;
  --accent-green: #16a34a;
  --shadow: 0 4px 12px rgba(190, 24, 93, 0.1);
  --shadow-sm: 0 1px 4px rgba(190, 24, 93, 0.05);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 17. 미드나잇 네이비 */
html.theme-navy {
  --bg-primary: #020617;
  --bg-secondary: #0f172a;
  --bg-tertiary: #1e293b;
  --bg-sidebar: #020617;
  --bg-titlebar: #0f172a;
  --bg-card: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #e2e8f0;
  --text-muted: #94a3b8;
  --text-sidebar: #f8fafc;
  --text-sidebar-muted: #e2e8f0;
  --border: rgba(248, 250, 252, 0.1);
  --accent-blue: #3b82f6;
  --accent-mint: #10b981;
  --accent-purple: #8b5cf6;
  --accent-orange: #f59e0b;
  --accent-red: #ef4444;
  --accent-green: #22c55e;
  --shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.4);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 18. 샌드 듄 */
html.theme-sand {
  --bg-primary: #fbf8f1;
  --bg-secondary: #f5efe6;
  --bg-tertiary: #e8dfca;
  --bg-sidebar: #8b7355;
  --bg-titlebar: #f5efe6;
  --bg-card: #ffffff;
  --text-primary: #3e3222;
  --text-secondary: #5c4b33;
  --text-muted: #8b7355;
  --text-sidebar: #fbf8f1;
  --text-sidebar-muted: #e8dfca;
  --border: rgba(62, 50, 34, 0.15);
  --accent-blue: #0284c7;
  --accent-mint: #0d9488;
  --accent-purple: #7e22ce;
  --accent-orange: #b45309;
  --accent-red: #dc2626;
  --accent-green: #16a34a;
  --shadow: 0 4px 12px rgba(139, 115, 85, 0.15);
  --shadow-sm: 0 1px 4px rgba(139, 115, 85, 0.1);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 19. 와인 베리 */
html.theme-grape {
  --bg-primary: #2e0618;
  --bg-secondary: #4a0428;
  --bg-tertiary: #1f020f;
  --bg-sidebar: #1f020f;
  --bg-titlebar: #4a0428;
  --bg-card: #4a0428;
  --text-primary: #fce7f3;
  --text-secondary: #fbcfe8;
  --text-muted: #f472b6;
  --text-sidebar: #fce7f3;
  --text-sidebar-muted: #fbcfe8;
  --border: rgba(252, 231, 243, 0.15);
  --accent-blue: #38bdf8;
  --accent-mint: #2dd4bf;
  --accent-purple: #e879f9;
  --accent-orange: #fbbf24;
  --accent-red: #f87171;
  --accent-green: #34d399;
  --shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 20. 사이버펑크 */
html.theme-cyber {
  --bg-primary: #050505;
  --bg-secondary: #121212;
  --bg-tertiary: #0a0a0a;
  --bg-sidebar: #050505;
  --bg-titlebar: #121212;
  --bg-card: #121212;
  --text-primary: #00ff41;
  --text-secondary: #008f11;
  --text-muted: #003b00;
  --text-sidebar: #00ff41;
  --text-sidebar-muted: #008f11;
  --border: #008f11;
  --accent-blue: #0ff;
  --accent-mint: #00ff41;
  --accent-purple: #f0f;
  --accent-orange: #ffaa00;
  --accent-red: #f00;
  --accent-green: #00ff41;
  --shadow: 0 0 15px rgba(0, 255, 65, 0.2);
  --shadow-sm: 0 0 5px rgba(0, 255, 65, 0.1);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

`;
  
  const newContent = content.substring(0, startIndex) + newThemes + content.substring(endIndex);
  fs.writeFileSync(cssPath, newContent, 'utf8');
  console.log('Successfully updated CSS themes');
} else {
  console.log('Could not find start or end pattern');
}
