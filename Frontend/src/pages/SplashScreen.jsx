import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/logo.png'; 

const SplashScreen = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => navigate('/home'), 500);
    }, 4000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className={`
        fixed inset-0 flex items-center justify-center bg-white
        transition-opacity duration-700 ease-out
        ${visible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <img
        src={Logo}
        alt="Splash Logo"
        className="w-60 h-60 rounded-full object-cover shadow-lg"
      />
    </div>
  );
};

export default SplashScreen;
