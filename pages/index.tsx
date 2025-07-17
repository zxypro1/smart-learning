import { Box, Text } from '@mantine/core';
import { SearchInput } from '@/components/Search/SearchInput';
import { AnimatedLogo } from '@/components/AnimatedLogo/AnimatedLogo';

export default function HomePage() {
  return (
    <Box style={{ maxWidth: 700, margin: '0 auto', paddingTop: 64 }}>
      <AnimatedLogo />
      <Text ta="center" size="xl" style={{ color: '#fff', marginBottom: 16 }}>
        Smart Learning
      </Text>
      <Text ta="center" size="lg" style={{ color: '#fff', marginBottom: 32 }}>
        AI 自学、网课制作与分享平台
      </Text>
      <Box style={{ borderRadius: 24, backdropFilter: 'blur(12px)', padding: 24, marginBottom: 24, animation: 'fadein 1s' }}>
        <Box style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)', width: 'fit-content', margin: '0 auto 16px auto' }}>
          <Text size="md" style={{ color: '#fff' }}>
            🚀 支持课程进度记录 & 答题草稿保存 & Markdown 导出！
          </Text>
        </Box>
        <SearchInput />
      </Box>
      <style jsx global>{`
        @keyframes fadein {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </Box>
  );
}