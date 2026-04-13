import Sidebar from './Sidebar';
export default function Layout({ children }) {
  return <div className="min-h-screen bg-slate-950 text-white flex"><Sidebar /><main className="flex-1 p-6">{children}</main></div>;
}
