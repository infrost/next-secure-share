// app/page.tsx
import View from './view';

// （可选，但强烈推荐）添加此行可以强制页面动态渲染，作为双重保险来解决此问题。
//export const dynamic = 'force-dynamic';

// interface PageProps {
//   searchParams: { [key: string]: string | string[] | undefined };
// }

export default async function ViewPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // 页面本身不做任何复杂的逻辑，
  // 只是把 searchParams.v 参数传递给 View 组件。
  // 这种隔离可以有效避免静态分析错误。
  return <View v={searchParams.v} />;
}