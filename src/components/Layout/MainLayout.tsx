import { Outlet } from 'react-router-dom';
import TopBar from '../TopBar/TopBar';
import ChatbotWidget from '../Chatbot/ChatbotWidget';
import './MainLayout.css';

const MainLayout = () => {
  return (
    <div className="main-layout">
      <TopBar />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="main-footer">
        <p>&copy; {new Date().getFullYear()} Bonita Umroh. All rights reserved.</p>
      </footer>
      <ChatbotWidget />
    </div>
  );
};

export default MainLayout;
