import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import FileManager from './pages/FileManager';
import Chat from './pages/Chat';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';
import ToastContainer from './components/UI/ToastContainer';
import PageTransition from './components/UI/PageTransition';
import { useStore } from './store';

function App() {
  const location = useLocation();
  const { settings } = useStore();

  const fontSizeClass =
    settings.fontSize === 'small' ? 'text-sm' :
    settings.fontSize === 'large' ? 'text-lg' : 'text-base';

  return (
    <div className={`min-h-screen bg-nvidia-black text-nvidia-white ${fontSizeClass}`}>
      <Layout>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
            <Route path="/files" element={<PageTransition><FileManager /></PageTransition>} />
            <Route path="/chat" element={<PageTransition><Chat /></PageTransition>} />
            <Route path="/tasks" element={<PageTransition><Tasks /></PageTransition>} />
            <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </Layout>
      <ToastContainer />
    </div>
  );
}

export default App;
