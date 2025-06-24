import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // 새로운 버전이 있을 때 자동으로 업데이트
      injectRegister: 'auto',
      workbox: {
        // 오프라인에서 작동할 수 있도록 캐싱할 파일 패턴 정의
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      // PWA의 핵심 정보인 manifest 파일 설정
      manifest: {
        name: '학습 퀴즈 앱', // 앱의 전체 이름
        short_name: '퀴즈', // 홈 화면에 표시될 짧은 이름
        description: '퀴즈 앱', // 앱 설명
        theme_color: '#ffffff', // 앱의 테마 색상 (주로 상단바 색상에 영향)
        background_color: '#ffffff', // 스플래시 화면의 배경 색상
        start_url: '/', // 앱이 시작될 때 열릴 페이지
        display: 'standalone', // 주소창 없는 앱처럼 표시
        orientation: 'portrait', // 세로 모드로 고정
        icons: [ // 2단계에서 준비한 아이콘 경로
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
